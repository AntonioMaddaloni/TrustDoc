// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DocumentStorageWithDeletes {
    address public owner;

    struct Document {
        string fileName;
        uint256 fileSize;
        string teeHash;
        address uploader;
        uint256 timestamp;
        bool exists; // true = attivo, false = rimosso (soft-deleted) o mai esistito
    }

    mapping(uint256 => Document) public documents;
    mapping(string => uint256) public teeHashToId; // 0 = not found
    uint256 private documentCounter;

    event DocumentStored(uint256 indexed documentId, address indexed uploader, string fileName, uint256 fileSize, string teeHash, uint256 timestamp);
    event DocumentSoftDeleted(uint256 indexed documentId, address indexed by);
    event DocumentRestored(uint256 indexed documentId, address indexed by);
    event DocumentHardDeleted(uint256 indexed documentId, address indexed by);

    modifier validString(string memory _str) {
        require(bytes(_str).length > 0, "String non puo essere vuota");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    modifier onlyUploaderOrOwner(uint256 _id) {
        require(documents[_id].exists, "Documento non esiste");
        require(msg.sender == documents[_id].uploader || msg.sender == owner, "Non autorizzato");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice salva un documento; impedisce duplicati attivi basati su teeHash
    function storeDocument(
        string memory _fileName,
        uint256 _fileSize,
        string memory _teeHash
    )
        public
        validString(_fileName)
        validString(_teeHash)
        returns (uint256)
    {
        require(_fileSize > 0, "File size deve essere maggiore di 0");

        uint256 existingId = teeHashToId[_teeHash];
        if (existingId != 0) {
            // se esiste una entry, blocca solo se è ancora attiva
            require(!documents[existingId].exists, "Documento gia esistente attivo");
        }

        documentCounter++;
        uint256 documentId = documentCounter;

        documents[documentId] = Document({
            fileName: _fileName,
            fileSize: _fileSize,
            teeHash: _teeHash,
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        // assegna o sovrascrive la mappa; se sovrascrive è perché era soft-deleted
        teeHashToId[_teeHash] = documentId;

        emit DocumentStored(documentId, msg.sender, _fileName, _fileSize, _teeHash, block.timestamp);
        return documentId;
    }

    function getDocument(uint256 _documentId)
        public
        view
        returns (
            string memory fileName,
            uint256 fileSize,
            string memory teeHash,
            address uploader,
            uint256 timestamp,
            bool isActive
        )
    {
        require(_documentId != 0 && (_documentId <= documentCounter), "Id non valido");
        Document memory doc = documents[_documentId];
        return (doc.fileName, doc.fileSize, doc.teeHash, doc.uploader, doc.timestamp, doc.exists);
    }

    /// ritorna id se esiste (anche se soft-deleted). La chiamata chiamante può controllare exists.
    function getDocumentIdByTee(string memory _teeHash) public view returns (uint256) {
        return teeHashToId[_teeHash];
    }

    /* ----------------
       SOFT DELETE
       - mantiene i dati nello storage (audit trail)
       - setta exists = false
       - non rimuove la mappa per permettere restore (la mappa ancora punta all'id)
       ---------------- */
    function softDeleteDocument(uint256 _id) public {
        require(_id != 0 && _id <= documentCounter, "Id non valido");
        require(documents[_id].exists, "Documento gia non attivo");
        require(msg.sender == documents[_id].uploader || msg.sender == owner, "Non autorizzato");

        documents[_id].exists = false;

        emit DocumentSoftDeleted(_id, msg.sender);
    }

    function restoreDocument(uint256 _id) public {
        require(_id != 0 && _id <= documentCounter, "Id non valido");
        // Developer decision: solo uploader o owner possono ripristinare
        require(msg.sender == documents[_id].uploader || msg.sender == owner, "Non autorizzato");
        require(!documents[_id].exists, "Documento gia attivo");

        // Before restoring, ensure teeHash is not used by a different active doc
        string memory tee = documents[_id].teeHash;
        uint256 mappedId = teeHashToId[tee];
        if (mappedId != 0 && mappedId != _id) {
            require(!documents[mappedId].exists, "TEE hash usato da altro documento attivo");
            // se mappedId non attivo, sovrascriviamo la mappa con _id (ok)
        }

        documents[_id].exists = true;
        teeHashToId[tee] = _id; // assicurati che la mappa punti al doc ripristinato

        emit DocumentRestored(_id, msg.sender);
    }

    /* ----------------
       HARD DELETE
       - cancella la struct in storage (libera slot di storage -> rimborso gas parziale)
       - rimuove la mapping teeHashToId
       - NOTA: eventi e logs storici restano immutati nella chain
       ---------------- */
    function hardDeleteDocument(uint256 _id) public {
        require(_id != 0 && _id <= documentCounter, "Id non valido");
        // per hard delete qui richiediamo solo owner (decisione di sicurezza)
        require(msg.sender == owner || msg.sender == documents[_id].uploader, "Non autorizzato");

        // salva teeHash prima di delete
        string memory tee = documents[_id].teeHash;

        // delete struct e mapping
        delete documents[_id];
        // se la mapping punta a questo id, resettala; se punta ad altro non toccare
        if (teeHashToId[tee] == _id) {
            delete teeHashToId[tee];
        }

        emit DocumentHardDeleted(_id, msg.sender);
    }

    /* Utility: permettere cambi di owner */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Owner non valido");
        owner = _newOwner;
    }
}
