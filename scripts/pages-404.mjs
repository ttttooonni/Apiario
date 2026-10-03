import { copyFileSync, existsSync } from "node:fs";

const index = "dist/index.html";
if (!existsSync(index)) {
  console.error("No está dist/index.html");
  process.exit(1);
}
copyFileSync(index, "dist/404.html");
console.log("404.html listo para GitHub Pages");
