const fs = require("fs");
const { google } = require("googleapis");
const SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"];

const express = require("express");
const { file } = require("googleapis/build/src/apis/file");
const app = express();

// Use Public Folder as Resources
app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/views");

// Home
app.get("/", async (req, res) => {
  res.render("home.html");
});

app.get("/tugas", async (request, response) => {
  if (request.query.token) {
    response.render("berhasil.html");
  }

  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    authorize(JSON.parse(content), getTugas);
  });

  function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    getAccessToken(oAuth2Client, callback);
  }

  function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    response.render("tugas.html", { url: authUrl });

    let cekKode = setInterval(function () {
      if (!request.query.token) {
        console.log("Belum");
      } else {
        let code = request.query.token;
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.log("Error");
          oAuth2Client.setCredentials(token);
          callback(oAuth2Client);
        });

        console.log("Done Stopping");
        clearInterval(cekKode);
      }
    }, 5 * 1000);
  }

  function getTugas(auth) {
    const drive = google.drive({ version: "v3", auth });
    drive.files.list(
      {
        pageSize: 10,
        orderBy: "name",
        q: "name = 'Classroom'",
      },
      async (err, res) => {
        if (err) return console.log(err);
        const files = res.data;
        console.log(files);

        let id = files.files[0].id;
        let datadiri = await drive.files.get({
          fileId: id,
          fields: "*",
        });

        let picUrl = datadiri.data.owners[0].photoLink;
        datadiri = datadiri.data.owners[0].displayName;

        fs.readFile(
          "id.json",
          "utf8",
          async function readFileCallback(err, data) {
            if (err) {
              console.log(err);
            } else {
              obj = await JSON.parse(data); //now it an object
              await obj.isi.push({
                id: "https://drive.google.com/drive/u/0/folders/" + id,
                picurl: picUrl,
                name: datadiri,
              }); //add some data
              json = await JSON.stringify(obj); //convert it back to json
              await fs.writeFile("id.json", json, "utf8", (cb) => {
                console.log(cb);
              }); // write it back
              console.log("Data berhasil ditambah");
            }
          }
        );
      }
    );
  }
});

const listener = app.listen(process.env.PORT || 8987, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
