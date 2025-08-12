// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DocumentStorageWithDeletes is ReentrancyGuard {
    address public owner;

    // Ottimizzazione: packed struct per risparmiare gas
    struct Document {
        string fileName;        // slot 0
        string teeHash;        // slot 1
        address uploader;      // slot 2 (20 bytes)
        uint96 fileSize;       // slot 2 (12 bytes) - max ~79 trillion bytes
        uint64 timestamp;      // slot 3 (8 bytes) - valido fino al 2554
        bool exists;           // slot 3 (1 byte)
    }

    mapping(uint256 => Document) public documents;
    mapping(string => uint256) public teeHashToId;
    uint256 private documentCounter;
    
    // Limite per prevenire attacchi DOS
    uint256 public constant MAX_STRING_LENGTH = 256;
    uint256 public constant MAX_FILE_SIZE = type(uint96).max;

    // Eventi ottimizzati con più parametri indicizzati
    event DocumentStored(
        uint256 indexed documentId, 
        address indexed uploader, 
        string indexed teeHash,
        string fileName, 
        uint256 fileSize, 
        uint256 timestamp
    );
    event DocumentSoftDeleted(uint256 indexed documentId, address indexed by);
    event DocumentRestored(uint256 indexed documentId, address indexed by);
    event DocumentHardDeleted(uint256 indexed documentId, address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier validString(string memory _str) {
        bytes memory strBytes = bytes(_str);
        require(strBytes.length > 0 && strBytes.length <= MAX_STRING_LENGTH, "String non valida");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    modifier validId(uint256 _id) {
        require(_id > 0 && _id <= documentCounter, "Id non valido");
        _;
    }

    modifier documentExists(uint256 _id) {
        require(documents[_id].exists, "Documento non esiste");
        _;
    }

    modifier onlyUploaderOrOwner(uint256 _id) {
        Document storage doc = documents[_id];
        require(msg.sender == doc.uploader || msg.sender == owner, "Non autorizzato");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Salva un documento; impedisce duplicati attivi basati su teeHash
    /// @param _fileName Nome del file
    /// @param _fileSize Dimensione del file in bytes
    /// @param _teeHash Hash TEE univoco del documento
    /// @return documentId ID del documento creato
    function storeDocument(
        string memory _fileName,
        uint256 _fileSize,
        string memory _teeHash
    )
        external
        nonReentrant
        validString(_fileName)
        validString(_teeHash)
        returns (uint256)
    {
        require(_fileSize > 0 && _fileSize <= MAX_FILE_SIZE, "File size non valido");

        uint256 existingId = teeHashToId[_teeHash];
        if (existingId != 0) {
            require(!documents[existingId].exists, "Documento gia esistente attivo");
        }

        // Controllo overflow (extra sicurezza anche se Solidity 0.8+ protegge)
        require(documentCounter < type(uint256).max, "Limite documenti raggiunto");
        
        documentCounter++;
        uint256 documentId = documentCounter;

        documents[documentId] = Document({
            fileName: _fileName,
            fileSize: uint96(_fileSize),
            teeHash: _teeHash,
            uploader: msg.sender,
            timestamp: uint64(block.timestamp),
            exists: true
        });

        teeHashToId[_teeHash] = documentId;

        emit DocumentStored(documentId, msg.sender, _teeHash, _fileName, _fileSize, block.timestamp);
        return documentId;
    }

    /// @notice Recupera i dettagli di un documento
    /// @param _documentId ID del documento
    /// @return fileName Nome del file
    /// @return fileSize Dimensione del file
    /// @return teeHash Hash TEE
    /// @return uploader Indirizzo di chi ha caricato
    /// @return timestamp Timestamp di caricamento
    /// @return isActive Se il documento è attivo
    function getDocument(uint256 _documentId)
        external
        view
        validId(_documentId)
        returns (
            string memory fileName,
            uint256 fileSize,
            string memory teeHash,
            address uploader,
            uint256 timestamp,
            bool isActive
        )
    {
        Document storage doc = documents[_documentId];
        return (
            doc.fileName, 
            uint256(doc.fileSize), 
            doc.teeHash, 
            doc.uploader, 
            uint256(doc.timestamp), 
            doc.exists
        );
    }

    /// @notice Recupera l'ID di un documento tramite hash TEE
    /// @param _teeHash Hash TEE da cercare
    /// @return documentId ID del documento (0 se non trovato)
    function getDocumentIdByTee(string memory _teeHash) 
        external 
        view 
        validString(_teeHash)
        returns (uint256) 
    {
        return teeHashToId[_teeHash];
    }

    /// @notice Soft delete di un documento (mantiene i dati per audit)
    /// @param _id ID del documento da eliminare
    function softDeleteDocument(uint256 _id) 
        external 
        nonReentrant
        validId(_id)
        documentExists(_id)
        onlyUploaderOrOwner(_id)
    {
        documents[_id].exists = false;
        emit DocumentSoftDeleted(_id, msg.sender);
    }

    /// @notice Ripristina un documento soft-deleted
    /// @param _id ID del documento da ripristinare
    function restoreDocument(uint256 _id) 
        external 
        nonReentrant
        validId(_id)
        onlyUploaderOrOwner(_id)
    {
        Document storage doc = documents[_id];
        require(!doc.exists, "Documento gia attivo");

        // Controllo race condition: verifica che teeHash non sia usato da altro doc attivo
        string memory tee = doc.teeHash;
        uint256 mappedId = teeHashToId[tee];
        
        // Se la mappa punta ad altro documento, deve essere non attivo
        if (mappedId != 0 && mappedId != _id) {
            require(!documents[mappedId].exists, "TEE hash usato da altro documento attivo");
        }

        doc.exists = true;
        teeHashToId[tee] = _id; // Aggiorna mappa per puntare al documento ripristinato

        emit DocumentRestored(_id, msg.sender);
    }

    /// @notice Hard delete di un documento (rimuove completamente i dati)
    /// @dev Solo owner può eseguire hard delete per sicurezza
    /// @param _id ID del documento da eliminare permanentemente
    function hardDeleteDocument(uint256 _id) 
        external 
        nonReentrant
        validId(_id)
        onlyOwner
    {
        string memory tee = documents[_id].teeHash;

        // Rimuovi documento e mapping se punta a questo documento
        delete documents[_id];
        if (teeHashToId[tee] == _id) {
            delete teeHashToId[tee];
        }

        emit DocumentHardDeleted(_id, msg.sender);
    }

    /// @notice Trasferisce la proprietà del contratto
    /// @param _newOwner Nuovo proprietario
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Owner non valido");
        require(_newOwner != owner, "Stesso owner");
        
        address previousOwner = owner;
        owner = _newOwner;
        
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /// @notice Rinuncia alla proprietà (irreversibile)
    /// @dev Da usare con estrema cautela
    function renounceOwnership() external onlyOwner {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
    }

    /// @notice Recupera il numero totale di documenti creati
    /// @return count Numero totale di documenti
    function getTotalDocuments() external view returns (uint256) {
        return documentCounter;
    }

    /// @notice Verifica se un documento esiste ed è attivo
    /// @param _id ID del documento
    /// @return exists True se il documento esiste ed è attivo
    function isDocumentActive(uint256 _id) external view returns (bool) {
        if (_id == 0 || _id > documentCounter) return false;
        return documents[_id].exists;
    }
}