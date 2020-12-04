const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const verify = require('../utils/verifyToken');
const convertString = require('../utils/convertString');
const {responseError, callRes} = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');
// @route  POST it4788/friend/get_requested_friends
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/get_requested_friends
// -------------------------
// index : last addElement
// count: length of data
// -------------------------
// BODY:
// {
//   "token": "xxxxx",
//   "index": 3,
//   "count": 10
// }
router.post('/get_requested_friends', verify, async (req, res) => {
  let { index, count } = req.body;
  let id = req.user.id;
  let data = {
    request: [],
    total: 0
  };
  let thisUser;

  // check input data
  if ( index === undefined|| count === undefined) 
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, ': index, count');
  if (!checkInput.checkIsInteger (index) || !checkInput.checkIsInteger (count))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, ': index, count');
  if (index < 0 || count <= 0) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, ': index, count');

  try {
    thisUser = await User.findById(id)
      .select({ "friends": 1, "friendRequestReceived": 1, "_id": 1 })
      .populate('friendRequestReceived');
    // console.log(thisUser);

    let endFor = thisUser.friendRequestReceived.length < index + count ? thisUser.friendRequestReceived.length : index + count;
    for (let i = index; i < endFor; i++) {
      let sentUser;
      let newElement = {
        id: null, // id người gửi req
        username: null, // tên người gửi req
        avatar: null, // link avatar người gửi req
        same_friends: null, // số bạn chung
        created: null, // thời gian gần nhất req
      }
      let sentUserID = thisUser.friendRequestReceived[i].fromUser.toString();
      sentUser = await User.findById(sentUserID)
        .select({ "friends": 1, "friendRequestSent": 1, "phoneNumber": 1, "_id": 1, "name": 1, "avatar": 1 });

      // console.log(sentUser);
      newElement.id = sentUser._id;
      newElement.username = sentUser.name;
      newElement.avatar = sentUser.avatar;
      newElement.same_friends = 0;
      // find number of same_friends
      if (thisUser.friends.length != 0 && sentUser.friends.length != 0) {
        newElement.same_friends = countSameFriend(thisUser.friends, sentUser.friends);
      }
      newElement.created = validTime.timeToSecond(thisUser.friendRequestReceived[i].lastCreated);
      data.request.push(newElement);
    }
    if (data.request.length == 0) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    thisUser = await User.findById(id);
    data.total = thisUser.friendRequestReceived.length;
    return callRes(res, responseError.OK, data);
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR);
  }
})


// @route  POST it4788/friend/set_request_friend
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/set_request_friend
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082"
// }
router.post('/set_request_friend', verify, async (req, res) => {
  let code, message;
  let data = {
    requested_friends: null // số người đang đươc tài khoản hiện tại gửi request friend
  }

  let { user_id } = req.body; // user_id là id của người nhận request friend
  let id = req.user.id;
  let targetUser, thisUser;
  if (id == user_id) {
    code = 1004;
    message = "invalid parameter";
  } else {
    try {
      targetUser = await User.findById(user_id);
      thisUser = await User.findById(id);

      let indexExist = thisUser.friends.findIndex(element => element.friend._id.equals(targetUser._id));
      if (indexExist < 0) {
        thisUser.friendRequestSent.push();

        // add new element to sent request
        let addElement = { "_id": targetUser._id };
        let isExisted = thisUser.friendRequestSent.findIndex(element => element._id.equals(addElement._id));
        if (isExisted < 0) {
          thisUser.friendRequestSent.push(addElement);
          thisUser = await thisUser.save();
        }

        // add new or update exist element of request received
        let addElement1 = { fromUser: { "_id": thisUser._id } };
        let isExisted1 = targetUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(addElement1.fromUser._id));

        if (isExisted1 < 0) {
          targetUser.friendRequestReceived.push(addElement1);
        } else {
          let currentTime = Date.now();
          targetUser.friendRequestReceived[isExisted1].lastCreated = currentTime;
        }
        targetUser = await targetUser.save();
        code = 1000;
        message = "OK";
      } else {
        code = 1010;
        message = "you two are friend already!!"
      }
      data.requested_friends = thisUser.friendRequestSent.length;

    } catch (err) {
      if (!targetUser) {
        code = 1004;
        message = "not found user_id";
      }
      else {
        code = 1005;
        message = "Unknown error";
      }

    }
  }

  res.json({ code, message, data })
})



router.post("/set_block", verify, async(req, res) => {
    let code, message;
    let thisUser, targetUser;

    let { token, user_id, type } = req.body;
    let id = req.user.id;
    if (!token || !user_id || !type){
        code = 1002;
        message = "Please enter all fields";
    }
    if (user_id == id){
        code = 1004;
        message = "Can't block yourself";
    }
    thisUser = await User.findById(id);
    targetUser = await User.findById(user_id);
    if (!targetUser){
        code = 9995;
        message = "User not existed";
    }
    else{
        let index = thisUser.blockedList.findIndex(element => element.user._id.equals(targetUser._id));
        if (index < 0) {
            if (type == 1){
                thisUser.blockedList.push({ user: targetUser._id, createdAt: Date.now() });
                thisUser.save();
                code = 1000;
                message = "Successfully blocked this user";
            }
            else{
                code = 1004;
                message = "You have already blocked this user";
            }
        }
        else{
            if (type == 0){
                thisUser.blockedList.splice(index, 1);
                thisUser.save();
                code = 1000;
                message = "Successfully unblocked this user";
            }
            else{
                code = 1004;
                message = "You haven't blocked this user";
            }
        }
    }
    res.json({ code, message });
});

// @route  POST it4788/friend/set_accept_friend
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/set_accept_friend
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082",
//   "is_accept": 0,
// }
router.post('/set_accept_friend', verify, async (req, res) => {
  let thisUser, sentUser;

  // user_id là id của người nhận request friend
  // is_accept : 0 là từ chối, 1 là đồng ý
  let { user_id, is_accept } = req.body;
  if ( user_id === undefined|| is_accept === undefined) 
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'user_id, is_accept');
  if (!checkInput.checkIsInteger (is_accept))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'is_accept');
  is_accept = parseInt(is_accept, 10);
  if (is_accept != 0 && is_accept != 1) 
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'is_accept');
  let id = req.user.id;
  if (id == user_id) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID,'user_id');
  } else {
    try {
      thisUser = await User.findById(id);
      if(!thisUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'thisUser');
      sentUser = await User.findById(user_id);
      if(!sentUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'sentUser');
      if (is_accept == 0) {
        // xóa req bên nhận
        let indexExist = thisUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(sentUser._id));
        if (indexExist < 0) return callRes(res, responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER);
        thisUser.friendRequestReceived.splice(indexExist, 1);
        // xóa req bên gửi
        let indexExist1 = sentUser.friendRequestSent.findIndex(element =>
          element._id.equals(thisUser._id));
        sentUser.friendRequestSent.splice(indexExist1, 1);
        // save
        thisUser = await thisUser.save();
        sentUser = await sentUser.save();
        return callRes(res, responseError.OK);
      } else if (is_accept == 1) {
        let currentTime = Date.now();
        // bỏ block 

        // xóa req bên nhận
        let indexExist = thisUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(sentUser._id));
        if (indexExist < 0) return callRes(res, responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER);
        thisUser.friendRequestReceived.splice(indexExist, 1);
        // thêm bạn bên nhận
        let indexExist2 = thisUser.friends.findIndex(element =>
          element.friend._id.equals(sentUser._id))
        if (indexExist2 < 0) thisUser.friends.push({ friend: sentUser._id, createdAt: currentTime });
        // thêm bạn bên gửi
        let indexExist3 = sentUser.friends.findIndex(element =>
          element.friend._id.equals(thisUser._id))
        if (indexExist3 < 0) sentUser.friends.push({ friend: thisUser._id, createdAt: currentTime });
        // xóa req bên gửi
        let indexExist1 = sentUser.friendRequestSent.findIndex(element =>
          element._id.equals(thisUser._id));
        sentUser.friendRequestSent.splice(indexExist1, 1);
        // save
        thisUser = await thisUser.save();
        sentUser = await sentUser.save();
        return callRes(res, responseError.OK);
      }

    } catch (error) {
      return callRes(res, responseError.UNKNOWN_ERROR, error.message);
    }
  }
})


router.post("/get_list_blocks", verify, async(req, res) => {
    let { token, index, count } = req.body;
    let id = req.user.id;
    let code, message;
    let data = [];
    let targetUser;
    if (!token || !index || !count){
        code = 1002;
        message = "Please enter all fields";
    }
    targetUser = await User.findById(id);
    let endFor = targetUser.blockedList.length < index + count ? targetUser.blockedList.length : index + count;
    for (let i = index; i < endFor; i++) {
        let x = targetUser.blockedList[i];
        let userInfo = {
            id: null, // id of this guy
            username: null,
            avatar: null,
        }
        userInfo.id = x.user._id.toString();
        userInfo.username = x.user.name;
        userInfo.avatar = x.user.avatar;
        data.push(userInfo);
    }
    code = 1000;
    message = "Successfully get block list";
    res.json({ code, message, data});
});

// @route  POST it4788/friend/get_user_friends
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/get_user_friends
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082",
//   "index": 4,
//   "count": 10
// }
router.post('/get_user_friends', verify, async (req, res) => {
  // input
  let { user_id, index, count } = req.body;
  // user id from token
  let id = req.user.id;

  let data = {
    friends: [],
    total: 0
  }

  // check input data
  if ( index === undefined|| count === undefined) 
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, ': index, count');
  if (!checkInput.checkIsInteger (index) || !checkInput.checkIsInteger (count))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, ': index, count');
  if (index < 0 || count <= 0) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, ': index, count');

  // var
  let thisUser, targetUser;

  try {
    thisUser = await User.findById(id).select({ "friends": 1 });
    if (!thisUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'thisUser')
    // console.log(thisUser);
    if (user_id && user_id != id) {
      targetUser = await User.findById(user_id).select({ "friends": 1 });
      if (!targetUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'targetUser');
      // check block here

    } else {
      targetUser = thisUser;
    }
    await targetUser.populate({ path: 'friends.friend', select: 'friends' }).execPopulate();
    // console.log(targetUser);

    let endFor = targetUser.friends.length < index + count ? targetUser.friends.length : index + count;
    for (let i = index; i < endFor; i++) {
      let x = targetUser.friends[i];
      let friendInfor = {
        id: null, // id of this guy
        username: null,
        avatar: null,
        same_friends: 0, //number of same friends
        created: null //time start friend between this guy and targetUser
      }
      friendInfor.id = x.friend._id.toString();
      friendInfor.username = x.friend.username;
      friendInfor.avatar = x.friend.avatar;
      friendInfor.created = validTime.timeToSecond(x.createdAt) ;
      
      if (!thisUser._id.equals(x.friend._id))
        if (thisUser.friends.length > 0 && x.friend.friends.length > 0) {
          friendInfor.same_friends = countSameFriend(thisUser.friends, x.friend.friends);
        }
      data.friends.push(friendInfor);
    }
    if (data.friends.length == 0) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'friends');
    data.total = targetUser.friends.length;
    return callRes(res, responseError.OK, data);
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
})

// count same friend between 2 array x, y
function countSameFriend(x, y) {
  let xx = x.map(e => e.friend.toString());
  let yy = y.map(e => e.friend.toString());
  let z = xx.filter(function (val) {
    return yy.indexOf(val) != -1;
  });
  return z.length;
}

module.exports = router;
