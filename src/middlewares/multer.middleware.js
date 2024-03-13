import multer from "multer";
    /**
     * A function that specifies the destination for storing the file.
     *
     * @param {Object} req - the request object
     * @param {Object} file - the file object
     * @param {Function} cb - the callback function
     * @return {void} 
     */
    
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ storage: storage })