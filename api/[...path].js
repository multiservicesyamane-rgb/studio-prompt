"use strict";

/* Vercel n'autorise les écritures temporaires que dans /tmp. Les documents
   durables sont conservés dans Supabase. */
process.env.GEN_DIR = process.env.GEN_DIR || "/tmp/studio-prompt/generated";
process.env.SP_NO_DOTENV = "1";

module.exports = require("../server");
