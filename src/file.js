const fs = require("fs");
const file = {
  read(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, "utf-8", (err, data) => {
        return err ? reject(err) : resolve(data);
      });
    });
  },
  write(path, content = "") {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, content, "utf8", (err) => {
        return err ? reject(err) : resolve();
      });
    });
  },
};

module.exports = file;
