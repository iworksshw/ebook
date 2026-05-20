var express = require("express"),
    ssi     = require("ssi"),
    path    = require("path"),
    fs      = require("fs"),
    app     = express(),
    parser  = new ssi(__dirname, "", "");

// 정적 파일 서빙을 위한 설정
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일은 'public' 폴더에서 서빙
app.use("/common/css", express.static(path.join(__dirname, 'common/css')));  // CSS 파일 서빙
app.use("/common/js", express.static(path.join(__dirname, 'common/js')));    // JS 파일 서빙
app.use("/common/images", express.static(path.join(__dirname, 'common/images')));  // 이미지 파일 서빙

// HTML 요청 시 SSI 파싱 처리
app.use(function(req, res, next) {
    // request path가 정적 파일이 아니면 SSI 파싱
    if (req.path.endsWith(".html")) {  // HTML 파일만 처리
        var filename = path.join(__dirname, req.path === "/" ? "/index.html" : req.path);
        
        if (fs.existsSync(filename)) {
            // SSI 파서로 파일 내용 읽고 처리
            res.send(parser.parse(filename, fs.readFileSync(filename, { encoding: "utf8" })).contents);
        } else {
            next();
        }
    } else {
        next();
    }
});

app.listen(process.env.PORT || 3006);
