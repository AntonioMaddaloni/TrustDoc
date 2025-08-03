const { body, validationResult } = require("express-validator")

const docInsertValidator = [
  // Validazione per il nome del file
  body("fileName")
    .exists()
    .withMessage("File name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("File name must be between 1 and 255 characters")
    .matches(/\.pdf$/i)
    .withMessage("File must be a PDF"),

  // Validazione per la dimensione del file
  body("fileSize")
    .exists()
    .withMessage("File size is required")
    .isNumeric()
    .withMessage("File size must be a number")
    .custom((value) => {
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (Number.parseInt(value) > maxSize) {
        throw new Error("File size must be less than 10MB")
      }
      if (Number.parseInt(value) <= 0) {
        throw new Error("File size must be greater than 0")
      }
      return true
    }),

  // Validazione opzionale per i dati della firma
  body("signatureData")
    .optional()
    .isJSON()
    .withMessage("Signature data must be valid JSON"),

  // Middleware per controllare il file caricato
  (req, res, next) => {
    // Controlla se il file PDF è presente
    if (!req.file && !req.files) {
      return res.status(422).json({
        errors: [
          {
            msg: "PDF file is required",
            param: "pdf",
            location: "file",
          },
        ],
      })
    }

    // Se usi multer con single('pdf')
    if (req.file) {
      // Controlla il tipo MIME
      if (req.file.mimetype !== "application/pdf") {
        return res.status(422).json({
          errors: [
            {
              msg: "File must be a PDF",
              param: "pdf",
              location: "file",
            },
          ],
        })
      }

      // Controlla la dimensione del file (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (req.file.size > maxSize) {
        return res.status(422).json({
          errors: [
            {
              msg: "File size must be less than 10MB",
              param: "pdf",
              location: "file",
            },
          ],
        })
      }
    }

    // Se usi multer con fields() o array()
    if (req.files && req.files.pdf) {
      const pdfFile = Array.isArray(req.files.pdf) ? req.files.pdf[0] : req.files.pdf

      if (pdfFile.mimetype !== "application/pdf") {
        return res.status(422).json({
          errors: [
            {
              msg: "File must be a PDF",
              param: "pdf",
              location: "file",
            },
          ],
        })
      }

      const maxSize = 10 * 1024 * 1024
      if (pdfFile.size > maxSize) {
        return res.status(422).json({
          errors: [
            {
              msg: "File size must be less than 10MB",
              param: "pdf",
              location: "file",
            },
          ],
        })
      }
    }

    next()
  },

  // Middleware finale per controllare gli errori di validazione
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    next()
  },
]

module.exports = docInsertValidator
