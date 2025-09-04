// test/DocumentStorageWithDeletes.test.js
require("@nomicfoundation/hardhat-chai-matchers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("DocumentStorageWithDeletes", function () {
  async function deployFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("DocumentStorageWithDeletes");
    const contract = await Contract.deploy();
    return { contract, owner, alice, bob, charlie };
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should start with zero documents", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.getTotalDocuments()).to.equal(0);
    });
  });

  describe("Store & Read", function () {
    it("should store a document and emit DocumentStored", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const fileName = "doc.pdf";
      const fileSize = 1234;
      const teeHash = "tee-hash-1";

      await expect(contract.connect(alice).storeDocument(fileName, fileSize, teeHash))
        .to.emit(contract, "DocumentStored")
        .withArgs(1, alice.address, teeHash, fileName, fileSize, anyValue);

      const id = await contract.getDocumentIdByTee(teeHash);
      expect(Number(id)).to.equal(1);

      const doc = await contract.getDocument(1);
      expect(doc.fileName).to.equal(fileName);
      expect(Number(doc.fileSize)).to.equal(fileSize);
      expect(doc.teeHash).to.equal(teeHash);
      expect(doc.uploader).to.equal(alice.address);
      expect(doc.isActive).to.equal(true);

      expect(await contract.getTotalDocuments()).to.equal(1);
      expect(await contract.isDocumentActive(1)).to.equal(true);
    });

    it("should prevent storing document with empty fileName", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(contract.connect(alice).storeDocument("", 100, "hash"))
        .to.be.revertedWith("String non valida");
    });

    it("should prevent storing document with empty teeHash", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(contract.connect(alice).storeDocument("file.pdf", 100, ""))
        .to.be.revertedWith("String non valida");
    });

    it("should prevent storing document with zero fileSize", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(contract.connect(alice).storeDocument("file.pdf", 0, "hash"))
        .to.be.revertedWith("File size non valido");
    });

    it("should prevent storing document with too long fileName", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const longName = "a".repeat(257); // > MAX_STRING_LENGTH
      await expect(contract.connect(alice).storeDocument(longName, 100, "hash"))
        .to.be.revertedWith("String non valida");
    });

    it("should prevent duplicate active documents with same teeHash", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const teeHash = "duplicate-hash";
      
      await contract.connect(alice).storeDocument("doc1.pdf", 100, teeHash);
      await expect(contract.connect(bob).storeDocument("doc2.pdf", 200, teeHash))
        .to.be.revertedWith("Documento gia esistente attivo");
    });

    it("should allow storing document with same teeHash if previous is deleted", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const teeHash = "reused-hash";
      
      await contract.connect(alice).storeDocument("doc1.pdf", 100, teeHash);
      await contract.connect(alice).softDeleteDocument(1);
      
      // Now bob can store with same teeHash
      await expect(contract.connect(bob).storeDocument("doc2.pdf", 200, teeHash))
        .to.emit(contract, "DocumentStored")
        .withArgs(2, bob.address, teeHash, "doc2.pdf", 200, anyValue);
    });
  });

  describe("Document Retrieval", function () {
    it("should revert for invalid document ID", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.getDocument(0)).to.be.revertedWith("Id non valido");
      await expect(contract.getDocument(999)).to.be.revertedWith("Id non valido");
    });

    it("should return 0 for non-existent teeHash", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.getDocumentIdByTee("non-existent")).to.equal(0);
    });

    it("should revert for empty teeHash in getDocumentIdByTee", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.getDocumentIdByTee("")).to.be.revertedWith("String non valida");
    });
  });

  describe("Soft Delete & Restore", function () {
    it("should soft delete and restore correctly", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const fileName = "doc2.pdf";
      const fileSize = 100;
      const teeHash = "tee-hash-2";

      await contract.connect(alice).storeDocument(fileName, fileSize, teeHash);

      await expect(contract.connect(alice).softDeleteDocument(1))
        .to.emit(contract, "DocumentSoftDeleted")
        .withArgs(1, alice.address);

      let doc = await contract.getDocument(1);
      expect(doc.isActive).to.equal(false);
      expect(await contract.isDocumentActive(1)).to.equal(false);

      await expect(contract.connect(alice).restoreDocument(1))
        .to.emit(contract, "DocumentRestored")
        .withArgs(1, alice.address);

      doc = await contract.getDocument(1);
      expect(doc.isActive).to.equal(true);
      expect(await contract.isDocumentActive(1)).to.equal(true);
    });

    it("should prevent restore if teeHash used by active doc", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("a.pdf", 10, "hashX");
      await contract.connect(alice).softDeleteDocument(1);
      
      // bob stores new doc with same teeHash -> becomes id 2
      await contract.connect(bob).storeDocument("b.pdf", 20, "hashX");
      
      // attempt to restore id 1 should revert
      await expect(contract.connect(alice).restoreDocument(1))
        .to.be.revertedWith("TEE hash usato da altro documento attivo");
    });

    it("should allow restore if mapping points to different inactive doc", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("a.pdf", 10, "hashY");
      await contract.connect(alice).softDeleteDocument(1);
      
      await contract.connect(bob).storeDocument("b.pdf", 20, "hashY");
      await contract.connect(bob).softDeleteDocument(2);
      
      // Now alice should be able to restore doc 1
      await expect(contract.connect(alice).restoreDocument(1))
        .to.emit(contract, "DocumentRestored")
        .withArgs(1, alice.address);
      
      // Mapping should now point to doc 1
      expect(await contract.getDocumentIdByTee("hashY")).to.equal(1);
    });

    it("should prevent soft delete of non-existent document", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      await expect(contract.connect(alice).softDeleteDocument(999))
        .to.be.revertedWith("Id non valido");
    });

    it("should prevent soft delete of already deleted document", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      await contract.connect(alice).softDeleteDocument(1);
      
      await expect(contract.connect(alice).softDeleteDocument(1))
        .to.be.revertedWith("Documento non esiste");
    });

    it("should prevent unauthorized soft delete", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      
      await expect(contract.connect(bob).softDeleteDocument(1))
        .to.be.revertedWith("Non autorizzato");
    });

    it("should allow owner to soft delete any document", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      
      await expect(contract.connect(owner).softDeleteDocument(1))
        .to.emit(contract, "DocumentSoftDeleted")
        .withArgs(1, owner.address);
    });

    it("should prevent restore of active document", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      
      await expect(contract.connect(alice).restoreDocument(1))
        .to.be.revertedWith("Documento gia attivo");
    });
  });

  describe("Hard Delete", function () {
    it("should hard delete and remove mapping if it pointed to that id", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("c.pdf", 11, "hashY");
      
      // mapping should return 1
      expect(Number(await contract.getDocumentIdByTee("hashY"))).to.equal(1);
      
      await expect(contract.connect(owner).hardDeleteDocument(1))
        .to.emit(contract, "DocumentHardDeleted")
        .withArgs(1, owner.address);
      
      // now mapping should be cleared (0)
      expect(Number(await contract.getDocumentIdByTee("hashY"))).to.equal(0);
      
      // document should return empty data
      const doc = await contract.getDocument(1);
      expect(doc.fileName).to.equal("");
      expect(doc.teeHash).to.equal("");
      expect(doc.uploader).to.equal("0x0000000000000000000000000000000000000000");
      expect(doc.isActive).to.equal(false);
    });

    it("should prevent uploader from hard deleting their own document (only owner can)", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      
      await expect(contract.connect(alice).hardDeleteDocument(1))
        .to.be.revertedWith("Solo owner");
    });

    it("should prevent unauthorized hard delete (only owner can)", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      
      await expect(contract.connect(bob).hardDeleteDocument(1))
        .to.be.revertedWith("Solo owner");
    });

    it("should not affect mapping if it points to different document", async function () {
      const { contract, owner, alice, bob } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("a.pdf", 10, "hashZ");
      await contract.connect(alice).softDeleteDocument(1);
      
      await contract.connect(bob).storeDocument("b.pdf", 20, "hashZ");
      
      // Now mapping points to document 2
      expect(await contract.getDocumentIdByTee("hashZ")).to.equal(2);
      
      // Hard delete document 1
      await contract.connect(owner).hardDeleteDocument(1);
      
      // Mapping should still point to document 2
      expect(await contract.getDocumentIdByTee("hashZ")).to.equal(2);
    });
  });

  describe("Ownership Management", function () {
    it("should transfer ownership correctly", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);
      
      await expect(contract.connect(owner).transferOwnership(alice.address))
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, alice.address);
      
      expect(await contract.owner()).to.equal(alice.address);
    });

    it("should prevent transferring to zero address", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      
      await expect(contract.connect(owner).transferOwnership("0x0000000000000000000000000000000000000000"))
        .to.be.revertedWith("Owner non valido");
    });

    it("should prevent transferring to same owner", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      
      await expect(contract.connect(owner).transferOwnership(owner.address))
        .to.be.revertedWith("Stesso owner");
    });

    it("should prevent non-owner from transferring ownership", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      
      await expect(contract.connect(alice).transferOwnership(bob.address))
        .to.be.revertedWith("Solo owner");
    });

    it("should renounce ownership correctly", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      
      await expect(contract.connect(owner).renounceOwnership())
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, "0x0000000000000000000000000000000000000000");
      
      expect(await contract.owner()).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("should prevent operations after ownership renouncement", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);
      
      await contract.connect(alice).storeDocument("doc.pdf", 100, "hash");
      await contract.connect(owner).renounceOwnership();
      
      // No one should be able to hard delete now (no owner)
      await expect(contract.connect(alice).hardDeleteDocument(1))
        .to.be.revertedWith("Solo owner");
    });
  });

  describe("Edge Cases & Security", function () {
    it("should handle maximum file size correctly", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const maxSize = "79228162514264337593543950335"; // uint96 max
      
      await expect(contract.connect(alice).storeDocument("big.pdf", maxSize, "hash"))
        .to.emit(contract, "DocumentStored");
    });

    it("should prevent file size overflow", async function () {
      const { contract, alice } = await loadFixture(deployFixture);
      const overflowSize = "79228162514264337593543950336"; // uint96 max + 1
      
      await expect(contract.connect(alice).storeDocument("big.pdf", overflowSize, "hash"))
        .to.be.revertedWith("File size non valido");
    });

    it("should handle complex restore scenarios", async function () {
      const { contract, alice, bob, charlie } = await loadFixture(deployFixture);
      const teeHash = "complex-hash";
      
      // Alice stores doc
      await contract.connect(alice).storeDocument("a.pdf", 100, teeHash);
      expect(await contract.getDocumentIdByTee(teeHash)).to.equal(1);
      
      // Alice deletes doc
      await contract.connect(alice).softDeleteDocument(1);
      
      // Bob stores with same hash
      await contract.connect(bob).storeDocument("b.pdf", 200, teeHash);
      expect(await contract.getDocumentIdByTee(teeHash)).to.equal(2);
      
      // Bob deletes his doc
      await contract.connect(bob).softDeleteDocument(2);
      
      // Charlie stores with same hash
      await contract.connect(charlie).storeDocument("c.pdf", 300, teeHash);
      expect(await contract.getDocumentIdByTee(teeHash)).to.equal(3);
      
      // Alice tries to restore - should fail
      await expect(contract.connect(alice).restoreDocument(1))
        .to.be.revertedWith("TEE hash usato da altro documento attivo");
      
      // Charlie deletes
      await contract.connect(charlie).softDeleteDocument(3);
      
      // Now Alice can restore
      await expect(contract.connect(alice).restoreDocument(1))
        .to.emit(contract, "DocumentRestored");
      
      expect(await contract.getDocumentIdByTee(teeHash)).to.equal(1);
    });
  });
});