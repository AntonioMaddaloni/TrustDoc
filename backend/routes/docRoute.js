const express = require("express")
const router = express.Router()
const multer = require("multer")
const authLib = require("../libs/authLib")
const UserDB = require("../libs/userDB")
const fs = require("fs")
const path = require("path")
const docInsertValidator = require("../validators/docInsertValidator") // Il validator che abbiamo creato

const serviceUrl = process.env.SERVICE_URL

// Configurazione multer per l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/pdfs"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `pdf-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed"), false)
    }
  },
})

router.use(express.json())

router.post("/", authLib(200),upload.single("pdf"), // Aggiunto middleware per upload
  docInsertValidator, // Aggiunto validator
  async (req, res) => {
    try {
      // Gestione upload PDF
      const { fileName, fileSize, signatureData } = req.body

      // Informazioni sul file caricato
      const fileInfo = {
        originalName: req.file.originalname,
        savedName: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedAt: new Date(),
      }

      console.log("PDF uploaded:", fileInfo)

      // Gestione dati firma se presenti
      let parsedSignatureData = null
      if (signatureData) {
        try {
          parsedSignatureData = JSON.parse(signatureData)
        } catch (parseError) {
          console.log("Error parsing signature data:", parseError)
        }
      }

      // Qui puoi salvare i dati del documento nel database
      // Esempio: let document = await DocumentDB.createDocument({...});

      return res.status(200).json({
        success: true,
        message: "PDF uploaded successfully!",
        data: {
          fileName: fileInfo.originalName,
          size: fileInfo.size,
          uploadedAt: fileInfo.uploadedAt,
          hasSignature: !!parsedSignatureData,
        },
      })
    } catch (err) {
      console.log(err)

      // Cleanup del file in caso di errore
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError)
        }
      }

      return res.status(500).json({
        success: false,
        message: err.message || "Error uploading PDF",
      })
    }
  },
)

// Gestione errori multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({
        success: false,
        errors: [{ msg: "File size too large (max 10MB)", param: "pdf" }],
      })
    }
  }

  if (error.message === "Only PDF files are allowed") {
    return res.status(422).json({
      success: false,
      errors: [{ msg: "Only PDF files are allowed", param: "pdf" }],
    })
  }

  res.status(500).json({
    success: false,
    message: "Server error during file upload",
  })
})

module.exports = router
