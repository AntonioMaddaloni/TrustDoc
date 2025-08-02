const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name must be at most 50 characters']
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true,
    minlength: [2, 'Surname must be at least 2 characters'],
    maxlength: [50, 'Surname must be at most 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role_type: {
    type: Number,
    enum: {
      values: [0, 100, 200],
      message: 'Role type must be 0, 100, or 200'
    },
    default: 0,
    required: true
  },
  organization_id: {
    type: Types.ObjectId,
    ref: 'Organization',
    unique: true,
    sparse: true,
    default: null
  }
}, {
  timestamps: { createdAt: 'create_at', updatedAt: 'updated_at' }, //Mongoose fara in modo che noi questi campi non li gestiamo mai a mano, ma se la vede lui per gestire i tempi di quando è stato creato o quando è stato modificato.
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    transform(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Pre-save hook to hash password (using bcrypt)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});
//Gli hook sono come observer pattern, in modo da sovrascrivere opzioni aggiuntive ai metodi di save o update, ad esempio:
// Quando dobbiamo inserire created_by o updated_by invece di metterli noi ogni volta a mano, scriviamo una sola volta la logica di business qui dentro e quindi verra
// eseguito in automatico il codice di inserimento di created_by ed ogni volta che viene modificato viene modificato in automatico l'updated_by senza che dobbiamo ricordarci
// ogni volta di riempire questi campi.


// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcrypt');
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model('User', userSchema);

module.exports = User;