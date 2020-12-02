const router = require('express').Router();
const Post = require('../models/Post');
const Report_Post = require('../models/Report_Post');
const verify = require('../utils/verifyToken');
const {getUserIDFromToken} = require('../utils/getUserIDFromToken');
var multer  = require('multer');
const { Storage } = require('@google-cloud/storage');
var {responseError, setAndSendResponse} = require('../response/error');
const MAX_IMAGE_NUMBER = 4;
const MAX_SIZE_IMAGE = 4 * 1024 * 1024; // for 4MB
const MAX_VIDEO_NUMBER = 1;
const MAX_SIZE_VIDEO = 10 * 1024 * 1024; // for 10MB
const MAX_WORD_POST = 500;

// Create new storage instance with Firebase project credentials
const storage = new Storage({
    projectId: process.env.GCLOUD_PROJECT_ID,
    credentials: {
        private_key: process.env.private_key,
        client_email: process.env.client_email
    }
});

// Create a bucket associated to Firebase storage bucket
const bucket =
    storage.bucket(process.env.GCLOUD_STORAGE_BUCKET_URL);

// Initiating a memory storage engine to store files as Buffer objects
const uploader = multer({
    storage: multer.memoryStorage(),
});

function countWord(str) {
    return str.split(" ").length;
}

// @route  POST it4788/post/get_list_videos
// @desc   get list videos
// @access Public
/*
Da check:
PARAMETER_IS_NOT_ENOUGH cua index, count
PARAMETER_TYPE_IS_INVALID cua index, count, last_id, token
PARAMETER_VALUE_IS_INVALID cua index, count
NO_DATA_OR_END_OF_LIST_DATA
Token co the co hoac khong
CAN_NOT_CONNECT_TO_DB neu get post loi
*/
router.post('/get_list_videos', async (req, res) => {
    var {token, index, count, last_id} = req.body;
    var data;
    // PARAMETER_IS_NOT_ENOUGH
    if((index !== 0 && !index) || (count !== 0 && !count)) {
        console.log("No have parameter index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((index && typeof index !== "string") || (count && typeof count !== "string") || (last_id && typeof last_id !== "string")
        || (token && typeof token !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    var user, posts;
    try {
        user = await getUserIDFromToken(token);
        posts = await Post.find({"video.url": { $ne: undefined }}).populate('author').sort("-created");
    } catch (err) {
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    // NO_DATA_OR_END_OF_LIST_DATA
    if(posts.length < 1) {
        console.log('No have posts');
        return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }

    let index_last_id = posts.findIndex((element) => {return element._id == last_id});
    if(index_last_id == -1) {
        last_id = posts[0]._id;
        index_last_id = 0;
    }

    let slicePosts = posts.slice(index_last_id + index, index_last_id + index + count);

    // NO_DATA_OR_END_OF_LIST_DATA
    if(slicePosts.length < 1) {
        console.log('No have posts');
        return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }

    data = {
        post: slicePosts.map(post => {
            return {
                id: post._id,
                video: {
                    url: post.video.url,
                    thumb: post.video.url ? "null": undefined
                },
                described: post.described,
                created: post.created.toString(),
                modified: post.modified.toString(),
                like: post.likedUser.length.toString(),
                comment: post.comments.length.toString(),
                is_liked: user ? (post.likedUser.includes(user.id) ? "1": "0") : "0",
                state: post.status,
                author: {
                    id: post.author._id,
                    username: post.author.name,
                    avatar: post.author.avatar
                }
            }
        }),
        new_items: index_last_id.toString(),
        last_id: last_id
    }

    res.status(200).send({
                        code: "1000",
                        message: "OK",
                        data: data
                    });
});

// @route  POST it4788/post/get_list_posts
// @desc   get list posts
// @access Public
/*
Da check:
PARAMETER_IS_NOT_ENOUGH cua index, count
PARAMETER_TYPE_IS_INVALID cua index, count, last_id, token
PARAMETER_VALUE_IS_INVALID cua index, count
NO_DATA_OR_END_OF_LIST_DATA
Token co the co hoac khong
CAN_NOT_CONNECT_TO_DB neu get post loi
*/
router.post('/get_list_posts', async (req, res) => {
    var {token, index, count, last_id} = req.body;
    var data;
    // PARAMETER_IS_NOT_ENOUGH
    if((index !== 0 && !index) || (count !== 0 && !count)) {
        console.log("No have parameter index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((index && typeof index !== "string") || (count && typeof count !== "string") || (last_id && typeof last_id !== "string")
        || (token && typeof token !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    var user, posts;
    try {
        user = await getUserIDFromToken(token);
        posts = await Post.find().populate('author').sort("-created");
    } catch (err) {
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    // NO_DATA_OR_END_OF_LIST_DATA
    if(posts.length < 1) {
        console.log('No have posts');
        return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }

    let index_last_id = posts.findIndex((element) => {return element._id == last_id});
    if(index_last_id == -1) {
        last_id = posts[0]._id;
        index_last_id = 0;
    }

    let slicePosts = posts.slice(index_last_id + index, index_last_id + index + count);

    // NO_DATA_OR_END_OF_LIST_DATA
    if(slicePosts.length < 1) {
        console.log('No have posts');
        return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }

    data = {
        posts: slicePosts.map(post => {
            return {
                id: post._id,
                image: post.image.map(image => { return {id: image._id, url: image.url};}),
                video: {
                    url: post.video.url,
                    thumb: post.video.url ? "null": undefined
                },
                described: post.described,
                created: post.created.toString(),
                modified: post.modified.toString(),
                like: post.likedUser.length.toString(),
                comment: post.comments.length.toString(),
                is_liked: user ? (post.likedUser.includes(user.id) ? "1": "0") : "0",
                state: post.status,
                author: {
                    id: post.author._id,
                    username: post.author.name,
                    avatar: post.author.avatar
                }
            }
        }),
        new_items: index_last_id.toString(),
        last_id: last_id
    }

    res.status(200).send({
                        code: "1000",
                        message: "OK",
                        data: data
                    });
});

// @route  POST it4788/post/get_post
// @desc   get post
// @access Private
/*
Da check:
PARAMETER_IS_NOT_ENOUGH cua id
PARAMETER_TYPE_IS_INVALID cua id va token
POST_IS_NOT_EXISTED
PARAMETER_VALUE_IS_INVALID cua id
CAN_NOT_CONNECT_TO_DB neu lay bai post that bai tu csdl hoac lay user bi loi
*/
router.post('/get_post', async (req, res) => {
    var {token, id} = req.body;
    var data;

    // PARAMETER_IS_NOT_ENOUGH
    if(id !== 0 && !id) {
        console.log("No have parameter id");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string") || (token && typeof token !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    var user;
    try {
        user = await getUserIDFromToken(token);
        const post = await Post.findById(id).populate('author');
        if(post) {
            res.status(200).send({
                code: "1000",
                message: "OK",
                data: {
                    id: post._id,
                    described: post.described,
                    created: post.created.toString(),
                    modified: post.modified.toString(),
                    like: post.likedUser.length.toString(),
                    comment: post.comments.length.toString(),
                    is_liked: user ? (post.likedUser.includes(user.id) ? "1": "0") : "0",
                    image: post.image.map(image => { return {id: image._id, url: image.url};}),
                    video: {
                        url: post.video.url,
                        thumb: post.video.url ? "null" : undefined
                    },
                    author: {
                        id: post.author._id,
                        name: post.author.name,
                        avatar: post.author.avatar
                    },
                    state: post.status
                }
              });
        } else {
            return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
        }
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
});


function uploadFile(file) {
    const newNameFile = new Date().toISOString() + file.originalname;
    const blob = bucket.file(newNameFile);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
    });
    const publicUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
    return new Promise((resolve, reject) => {

        blobStream.on('error', reject(new Error('Loi upload file')));
        blobStream.end(file.buffer, resolve({
            filename: newNameFile,
            url: publicUrl
        }));
    });
}


async function deleteRemoteFile(filename) {
    await bucket.file(filename).delete();
}

// @route  POST it4788/post/add_post
// @desc   add new post
// @access Public
/*
Da check:
PARAMETER_TYPE_IS_INVALID described, status
MAX_WORD_POST cua described
Have image and video
MAXIMUM_NUMBER_OF_IMAGES
Mimetype image is invalid
FILE_SIZE_IS_TOO_BIG cua anh va video
UPLOAD_FILE_FAILED cua anh va video
MAXIMUM_NUMBER_OF_VIDEOS
Mimetype video is invalid
CAN_NOT_CONNECT_TO_DB neu khong luu duoc post vao csdl
*/
var cpUpload = uploader.fields([{ name: 'image'}, { name: 'video'}]);
router.post('/add_post', cpUpload, verify, async (req, res, next) => {
    var {described, status} = req.body;
    var {image, video} = req.files;
    var user = req.user;

    // PARAMETER_TYPE_IS_INVALID
    if((described && typeof described !== "string") || (status && typeof status !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    if(described && countWord(described) > MAX_WORD_POST) {
        console.log("MAX_WORD_POST");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    if(image && video) {
        console.log("Have image and video");
        return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
    }

    var post = new Post({
        author: user.id,
        described: described,
        status: status
    });

    let promises;

    if(image) {
        // MAXIMUM_NUMBER_OF_IMAGES
        if(image.length > MAX_IMAGE_NUMBER) {
            console.log("MAXIMUM_NUMBER_OF_IMAGES");
            return setAndSendResponse(res, responseError.MAXIMUM_NUMBER_OF_IMAGES);
        }

        for(const item_image of image) {
            const filetypes = /jpeg|jpg|png/;
            const mimetype = filetypes.test(item_image.mimetype);
            // PARAMETER_TYPE_IS_INVALID
            if(!mimetype) {
                console.log("Mimetype image is invalid");
                return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
            }

            // FILE_SIZE_IS_TOO_BIG
            if (item_image.buffer.byteLength > MAX_SIZE_IMAGE) {
                console.log("FILE_SIZE_IS_TOO_BIG");
                return setAndSendResponse(res, responseError.FILE_SIZE_IS_TOO_BIG);
            }
        }

        promises = image.map(item_image => {
            return uploadFile(item_image);
        });
        try {
            const file = await Promise.all(promises);
            post.image = file;
        } catch (err) {
            console.log("UPLOAD_FILE_FAILED");
            return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
        }

    }

    if(video) {
        if(video.length > MAX_VIDEO_NUMBER) {
            console.log("MAX_VIDEO_NUMBER");
            return res.status(500).send({
                code: "1008",
                message: "Maximum number of video"
            });
        }

        for(const item_video of video) {
            const filetypes = /mp4/;
            const mimetype = filetypes.test(item_video.mimetype);
            if(!mimetype) {
                console.log("Mimetype video is invalid");
                return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
            }

            if (item_video.buffer.byteLength > MAX_SIZE_VIDEO) {
                console.log("Max video file size");
                return setAndSendResponse(res, responseError.FILE_SIZE_IS_TOO_BIG);
            }
        }

        promises = req.files.video.map(video => {
            return uploadFile(video);
        });
        try {
            const file = await Promise.all(promises);
            post.video = file[0];
        } catch (err) {
            console.log("UPLOAD_FILE_FAILED");
            return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
        }


    }

    try {
        const savedPost = await post.save();
        return res.status(201).send({
            code: "1000",
            message: "OK",
            data: {
                id: savedPost._id,
                url: null
            }
        });
    } catch (err) {
        console.log("CAN_NOT_CONNECT_TO_DB");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
});


// @route  POST it4788/post/delete_post
// @desc   delete a post
// @access Private
/*
Da check:
PARAMETER_IS_NOT_ENOUGH cua id, token
PARAMETER_TYPE_IS_INVALID cua id, token
PARAMETER_VALUE_IS_INVALID cua id
POST_IS_NOT_EXISTED
NOT_ACCESS
EXCEPTION_ERROR khi khong xoa duoc anh, video
CAN_NOT_CONNECT_TO_DB khi khong xoa duoc post trong csdl
*/
router.post('/delete_post', verify, async (req, res) => {
    var { id } = req.body;
    var user = req.user;

    // PARAMETER_IS_NOT_ENOUGH
    if(id !== 0 && !id) {
        console.log("No have parameter id");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    let post;
    try {
        post = await Post.findById(id);
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        console.log("Can not connect to DB");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    if (!post) {
        console.log("Post is not existed");
        return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
    }

    if(post.author != user.id) {
        console.log("Not Access");
        return setAndSendResponse(res, responseError.NOT_ACCESS);
    }

    if(post.image.length > 0) {
        for(image of post.image) {
            try {
                await deleteRemoteFile(image.filename);
            } catch (err) {
                console.log("Khong xoa duoc anh");
                return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
            }
        }
    }

    if(post.video.url) {
        try {
            await deleteRemoteFile(post.video.filename);
        } catch (err) {
            console.log("Khong xoa duoc video");
            return setAndSendResponse(res, responseError.EXCEPTION_ERROR);
        }
    }

    try {
        const deletedPost = await Post.findByIdAndDelete(id);
        return res.status(200).send({
            code: "1000",
            message: "OK"
        });
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        console.log("Can not connect to DB");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
})


// @route  POST it4788/post/edit_post
// @desc   edit an existing post
// @access Private
/*
Da check:
PARAMETER_TYPE_IS_INVALID cho image_del, gia tri cua mang image_del, id, described, status, image, video
Loai bo cac gia tri trung lap cua image_del
PARAMETER_IS_NOT_ENOUGH cua id
UNKNOWN_ERROR co ca anh va video gui di, xoa anh that bai
PARAMETER_VALUE_IS_INVALID cua id, phan tu cua mang image_del
CAN_NOT_CONNECT_TO_DB neu truy van post that bai
POST_IS_NOT_EXISTED
NOT_ACCESS
MAX_VIDEO_NUMBER
FILE_SIZE_IS_TOO_BIG cua image, video
UPLOAD_FILE_FAILED neu upload image va video that bai
MAXIMUM_NUMBER_OF_IMAGES
MAX_WORD_POST cua described
*/
router.post('/edit_post', cpUpload, verify, async (req, res) => {
    var { id, status, image_del, image_sort, described, auto_accept, auto_block } = req.body;
    var {image, video} = req.files;
    var user = req.user;

    if(image_del) {
        try {
            image_del = JSON.parse(image_del);
        } catch (err) {
            console.log("image_del parse loi PARAMETER_TYPE_IS_INVALID");
            return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
        }
        if(!Array.isArray(image_del)) {
            console.log("image_del PARAMETER_TYPE_IS_INVALID");
            return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
        }
        for(const id_image_del of image_del) {
            if(typeof id_image_del !== "string") {
                console.log("image_del element PARAMETER_TYPE_IS_INVALID");
                return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
            }
        }
        image_del = image_del.filter((item, i, ar) => ar.indexOf(item) === i);
    } else {
        image_del = [];
    }

    // PARAMETER_IS_NOT_ENOUGH
    if(id !== 0 && !id) {
        console.log("No have parameter id");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string") || (described && typeof described !== "string") || (status && typeof status !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    if(image && video) {
        console.log("Have image and video gui di");
        return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
    }

    let post;
    try {
        post = await Post.findById(id);
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        console.log("Can not connect to DB");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    if (!post) {
        console.log("Post is not existed");
        return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
    }

    if(post.author != user.id) {
        console.log("Not Access");
        return setAndSendResponse(res, responseError.NOT_ACCESS);
    }

    // Check gia tri image_del hop le
    if(image_del && image_del.length > 0) {
        for(const id_image_del of image_del) {
            let isInvalid = true;
            for(const image of post.image) {
                if(image.id == id_image_del) {
                    isInvalid = false;
                }
            }
            if(isInvalid) {
                console.log("Sai id");
                return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
            }
        }

        // Xoa anh
        for(const id_image_del of image_del) {
            console.log("xoa anh");
            var i;
            for(i=0; i < post.image.length; i++) {
                if(post.image[i]._id == id_image_del) {
                    break;
                }
            }
            try {
                await deleteRemoteFile(post.image[i].filename);
            } catch (err) {
                return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
            }
            post.image.splice(i, 1);
        }
    }

    let promise, file;

    if(video && !image) {
        if(post.image.length != 0) {
            console.log("Have image and video up video");
            return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
        }

        if(video.length > MAX_VIDEO_NUMBER) {
            console.log("MAX_VIDEO_NUMBER");
            return res.status(500).send({
                code: 1008,
                message: "Maximum number of video"
            });
        }

        for(const item_video of video) {
            const filetypes = /mp4/;
            const mimetype = filetypes.test(item_video.mimetype);
            if(!mimetype) {
                console.log("Mimetype video is invalid");
                return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
            }

            if (item_video.buffer.byteLength > MAX_SIZE_VIDEO) {
                console.log("Max video file size");
                return setAndSendResponse(res, responseError.FILE_SIZE_IS_TOO_BIG);
            }
        }

        promises = video.map(video => {
            return uploadFile(video);
        });

        try {
            if(post.video.url) {
                await deleteRemoteFile(post.video.filename);
            }
        } catch (err) {
            return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
        }

        try {
            file = await Promise.all(promises);
            post.video = file[0];
        } catch (err) {
            console.log("Upload fail");
            return setAndSendResponse(res, responseError.UPLOAD_FILE_FAILED);
        }
    }

    if(image && !video) {
        if(post.video.url) {
            console.log("Have image and video up anh");
            return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
        }

        for(const item_image of image) {
            const filetypes = /jpeg|jpg|png/;
            const mimetype = filetypes.test(item_image.mimetype);
            if(!mimetype) {
                console.log("Mimetype image is invalid");
                return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
            }

            if (item_image.buffer.byteLength > MAX_SIZE_IMAGE) {
                console.log("Max image file size");
                return setAndSendResponse(res, responseError.FILE_SIZE_IS_TOO_BIG);
            }
        }

        if(image.length + post.image.length > MAX_IMAGE_NUMBER) {
            console.log("Max image number");
            return setAndSendResponse(res, responseError.MAXIMUM_NUMBER_OF_IMAGES);
        }

        promises = image.map(item_image => {
            return uploadFile(item_image);
        });

        try {
            file = await Promise.all(promises);
            for(file_item of file) {
                post.image.push(file_item);
            }
        } catch (err) {
            console.log("Upload fail");
            return setAndSendResponse(res, responseError.UNKNOWN_ERROR);
        }
    }

    if(described) {
        console.log("Have described");
        if(countWord(described) > MAX_WORD_POST) {
            console.log("MAX_WORD_POST");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        post.described = described;
    }

    if(status) {
        console.log("Have status");
        post.status = status;
    }

    try {
        const savedPost = await post.save();
        return res.status(200).send({
            code: 1000,
            message: "OK"
        });
    } catch (err) {
        console.log("Edit fail");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
})

// @route  POST it4788/post/report_post
// @desc   report post
// @access Public
router.post('/report_post', verify, async (req, res) => {
    var {id, subject, details} = req.body;
    if(!id || !subject || !details) {
        console.log("No have parameter id, subject, details");
        return res.status(400).send({
            code: 1002,
            message: "Parameter is not enought"
        });
    }

    var user = req.user;

    let post;
    try {
        post = await Post.findById(id);
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return res.status(500).send({
                code: 1004,
                message: "Parameter value is invalid"
            });
        }
        console.log("Can not connect to DB");
        return res.status(500).send({
            code: 1001,
            message: "Can not connect to DB"
        });
    }

    if (!post) {
        console.log("Post is not existed");
        return res.status(404).send({
            code: 9992,
            message: "Post is not existed"
        });
    }

    const reportPost = new Report_Post({
        subject: subject,
        details: details,
        reporter: user.id
    });

    try {
        const savedReportPost = await reportPost.save();
        if(!post.reports_post || post.reports_post.length < 1) {
            post.reports_post = [savedReportPost._id];
        } else {
            post.reports_post.push(savedReportPost._id);
        }
        const savedPost = await post.save();
        return res.status(200).send({
            code: 1000,
            message: "OK"
        });
    } catch (err) {
        console.log(err);
        console.log("Can not connect to DB");
        return res.status(500).send({
            code: 1001,
            message: "Can not connect to DB"
        });
    }
})

module.exports = router;