const bcrypt = require("bcryptjs");
async function hashPassword(p){ const s=await bcrypt.genSalt(10); return bcrypt.hash(p,s); }
async function comparePassword(p,h){ return bcrypt.compare(p,h); }
module.exports={hashPassword,comparePassword};
