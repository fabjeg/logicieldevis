const { Schema, model } = require('mongoose');

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' }, // optionnel
    clientNom: { type: String, default: '', trim: true },
    contenu: { type: String, default: '' },
  },
  { timestamps: true }
);

noteSchema.index({ updatedAt: -1 });

module.exports = model('Note', noteSchema);
