// test/DocumentStorageWithDeletes.test.js
require("@nomicfoundation/hardhat-chai-matchers"); // registra i matchers come .to.emit, .changeEtherBalances, ecc.
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("DocumentStorageWithDeletes", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("DocumentStorageWithDeletes");
    const contract = await Contract.deploy(); // non serve await contract.deployed()
    return { contract, owner, alice, bob };
  }

  describe("Store & Read", function () {
    it("should store a document and emit DocumentStored", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const fileName = "doc.pdf";
      const fileSize = 1234;
      const teeHash = "tee-hash-1";

      await expect(contract.connect(alice).storeDocument(fileName, fileSize, teeHash))
        .to.emit(contract, "DocumentStored")
        .withArgs(1, alice.address, fileName, fileSize, teeHash, anyValue);

      const id = await contract.getDocumentIdByTee(teeHash);
      expect(Number(id)).to.equal(1);

      const doc = await contract.getDocument(1);
      // getDocument returns a tuple with named fields; use the names or indices
      expect(doc.fileName).to.equal(fileName);
      expect(Number(doc.fileSize)).to.equal(fileSize);
      expect(doc.teeHash).to.equal(teeHash);
      expect(doc.uploader).to.equal(alice.address);
      expect(doc.isActive).to.equal(true);
    });
  });

  describe("Soft delete / restore", function () {
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

      await expect(contract.connect(alice).restoreDocument(1))
        .to.emit(contract, "DocumentRestored")
        .withArgs(1, alice.address);

      doc = await contract.getDocument(1);
      expect(doc.isActive).to.equal(true);
    });

    it("should prevent restore if teeHash used by active doc", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      await contract.connect(alice).storeDocument("a.pdf", 10, "hashX");
      await contract.connect(alice).softDeleteDocument(1);

      // bob stores new doc with same teeHash -> becomes id 2
      await contract.connect(bob).storeDocument("b.pdf", 20, "hashX");

      // attempt to restore id 1 should revert with specific message
      await expect(contract.connect(alice).restoreDocument(1)).to.be.revertedWith("TEE hash usato da altro documento attivo");
    });
  });

  describe("Hard delete", function () {
    it("should hard delete and remove mapping if it pointed to that id", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      await contract.connect(alice).storeDocument("c.pdf", 11, "hashY");

      // mapping should return 1
      expect(Number(await contract.getDocumentIdByTee("hashY"))).to.equal(1);

      await expect(contract.connect(alice).hardDeleteDocument(1))
        .to.emit(contract, "DocumentHardDeleted")
        .withArgs(1, alice.address);

      // now mapping should be cleared (0)
      expect(Number(await contract.getDocumentIdByTee("hashY"))).to.equal(0);
    });
  });
});
