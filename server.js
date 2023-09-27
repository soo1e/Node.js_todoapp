const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true}))
const methodOverride = require('method-override')
app.use(methodOverride('_method'))
require('dotenv').config()


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const { ObjectId }  = require ('mongodb');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

var db;
MongoClient.connect('mongodb+srv://admin:qwer1234@cluster0.k66sh2u.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp', function (에러, client){
    // 연결되면 할 일
    if(에러) return console.log(에러)

    db = client.db('todoapp');

    app.listen(8080, function (){
        console.log('listening on 8080');
    });
})


let multer = require('multer');
var storage = multer.diskStorage({

    destination : function(req, file, cb){
        cb(null, './public/image')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname )
    }

});

var path = require('path');

var upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('PNG, JPG만 업로드하세요'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
});


app.get('/upload', function(요청, 응답){
    응답.render('upload.ejs')
});

app.post('/upload', upload.single('profile'), function(요청, 응답){
    응답.send('업로드완료')
});

app.get('/image/:imageName', function(요청, 응답){
    응답.sendFile( __dirname + './public/image' + 요청.params.imageName )
})

// 누군가가 /pet으로 방문을 하면 pet 관련된 안내문을 띄워주자.
app.get('/pet',function (요청, 응답){
    응답.send('펫 용품 쇼핑할 수 있는 페이지입니다.');
}) // ('경로', function())

app.get('/beauty',function (요청, 응답){
    응답.send('뷰티 용품 쇼핑할 수 있는 페이지입니다.');
}) // ('경로', function())

app.get('/',function (요청, 응답){
    응답.render('index.ejs');
}) // ('경로', function())

app.get('/write', function(요청, 응답) {
    응답.render('write.ejs');
});

app.get('/list', function(요청, 응답) {

    // db에 저장된 post라는 collection의 데이터를 꺼내주세요
    db.collection('post').find().toArray(function (에러, 결과) { // 모든 데이터 가져오기 : find().toArray();
        console.log(결과);
        응답.render('list.ejs', { posts : 결과 });

    });
});

app.get('/detail/:id', function(요청, 응답){
    db.collection('post').findOne({ _id : parseInt(요청.params.id) }, function(에러, 결과){
        console.log(결과);
        응답.render('detail.ejs', {data : 결과} )
    })
});

app.get('/edit/:id', function(요청, 응답) {
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function (에러, 결과){
        console.log(결과);
        응답.render('edit.ejs', { post : 결과 }) // /2로 접속하면 2번 게시물의 제목과 날짜를 edit.ejs로 보냄.
    })
})

app.put('/edit', function(요청, 응답){
    db.collection('post').updateOne({ _id : parseInt(요청.body.id) }, { $set : { 제목 : 요청.body.title, 날짜 : 요청.body.date } }, function (에러, 결과){
        console.log('수정 완료')
        응답.redirect('/list')
    })
})
app.get('/login', function(요청, 응답){
    응답.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(요청, 응답){
    응답.redirect('/')
});

passport.use(new LocalStrategy({
    usernameField: 'id', // 사용자가 제출한 아이디가 어디에 적혔는지
    passwordField: 'pw', // 사용자가 제출한 비밀번호가 어디에 적혔는지
    session: true, // 세션을 만들 것인지
    passReqToCallback: false, // 아이디 / 비밀번호 외에도 다른 정보 검사가 필요한지
}, function (입력한아이디, 입력한비번, done) {
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)

        if (!결과) return done(null, false, { message: '존재하지 않는 아이디입니다.' })
        if (입력한비번 == 결과.pw) {
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비밀번호가 틀렸습니다.' })
        }
    })
}));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (아이디, done) {
    db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
        done(null, 결과)
    })
});

app.post('/register', function (요청, 응답) {

    db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
        응답.redirect('/')
    })
})

app.post('/add', function (요청, 응답) {
    console.log(요청.user._id)
    응답.send('전송완료');
    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
        var 총게시물갯수 = 결과.totalPost;
        var post = { _id: 총게시물갯수 + 1, 작성자: 요청.user._id , 제목: 요청.body.title, 날짜: 요청.body.date }
        db.collection('post').insertOne( post , function (에러, 결과) {
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) { return console.log(에러) }
            })
        });
    });
});

app.delete('/delete', function (요청, 응답) {
    if (요청.body && 요청.body._id !== undefined) {
        요청.body._id = parseInt(요청.body._id);
        //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
        db.collection('post').deleteOne({_id : 요청.body._id, 작성자 : 요청.user._id }, function (에러, 결과) {
            if (에러) {
                console.log('에러', 에러);
                응답.status(500).send({ message: '에러가 발생했습니다' });
            } else {
                console.log('삭제완료');
                응답.status(200).send({ message: '성공했습니다' });
            }
        })
    } else {
        // _id가 요청 본문에 제공되지 않은 경우 처리
        응답.status(400).send({ message: '게시물 ID가 제공되지 않았습니다' });
    }
});

app.get('/mypage', 로그인유무, function (요청, 응답) {
    console.log(요청.user);
    응답.render('mypage.ejs', { 사용자 : 요청.user })
})

function 로그인유무(요청, 응답, next) {
    if (요청.user) {
        next()
    }
    else {
        응답.send('로그인을 해주세요.')
    }
}

app.get('/search', (요청, 응답) => {
    // 검색어가 제공되지 않았을 때, 모든 할 일 항목을 반환하는 쿼리를 수행합니다.
    const 검색어 = 요청.query.value || '';

    var 검색조건 = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: 요청.query.value,
                    path: '제목'  // 제목,날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        }
    ]
    // Cache-Control 헤더를 추가하여 캐시를 비활성화합니다.
    응답.setHeader('Cache-Control', 'no-store');

    db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
        console.log(결과)
        응답.render('search.ejs', { posts: 결과, 검색어: 검색어 }); // 검색어도 렌더링합니다.
    });
});


app.use('/', require('./routes/shop.js'));


app.get('/chat', 로그인유무, function(요청, 응답){
    db.collection('chatroom').find({ member : 요청.user._id }).toArray().then((결과)=>{
        console.log(결과);
        응답.render('chat.ejs', {data : 결과})
    })

});

app.post('/chatroom', function(요청, 응답){

    var 저장할거 = {
        title : '무슨무슨채팅방',
        member : [ObjectId(요청.body.당한사람id), 요청.user._id],
        date : new Date()
    }

    db.collection('chatroom').insertOne(저장할거).then(function(결과){
        응답.send('저장완료')
    });
});

app.post('/message', 로그인유무, function(요청, 응답){
    var 저장할거 = {
        parent : 요청.body.parent,
        userid : 요청.user._id,
        content : 요청.body.content,
        date : new Date(),
    }
    db.collection('message').insertOne(저장할거)
        .then((결과)=>{
            응답.send(결과);
        })
});


app.get('/message/:parentid', 로그인유무, function(요청, 응답){

    응답.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    });

    db.collection('message').find({ parent: 요청.params.parentid }).toArray()
        .then((결과)=>{
            console.log(결과);
            응답.write('event: test\n');
            응답.write(`data: ${JSON.stringify(결과)}\n\n`);
        });

});