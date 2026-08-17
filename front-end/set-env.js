const fs = require("fs");
const targetPath = "./src/environments/enviroment.production.ts";

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${process.env.API_URL || ""}',
};`;

fs.writeFileSync(targetPath, envConfigFile);
