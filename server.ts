import fs from "node:fs";
import https from "node:https";
import { parse } from "node:url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
};

app.prepare().then(() => {
  https
    .createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url || "", true);
      handle(req, res, parsedUrl);
    })
    .listen(3000, () => {
      console.log("> Ready on https://localhost:3000");
    });
});
