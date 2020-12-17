const { json } = require("express");
const FriendRequest = require("../models/friendRequest");
const User = require("../models/users");
const moment = require("moment");

exports.sendFriendRequest = async (req, res, next) => {
  const { toUser } = req.params;
  const newRequest = new FriendRequest({
    ...req.body,
    createdAt: moment().format("MM/DD/YYYY HH:mm"),
    status: "Pending",
    from: req.user._id,
    to: toUser,
  });
  //   console.log(newRequest);

  try {
    const isPresent = await FriendRequest.findOne({
      status: "Pending",
      from: req.user._id,
      to: toUser,
    });
    // console.log(isPresent);
    if (!isPresent) {
      const sentRequest = await newRequest.save();
      const user1 = await User.findByIdAndUpdate(toUser, {
        $push: { friendRequests: sentRequest },
      });
      const user2 = await User.findByIdAndUpdate(req.user._id, {
        $push: { friendRequests: sentRequest },
      });
      await user1.save();
      await user2.save();
      res.status(200).send({ message: "Request sent", user: user2 });
    } else {
      const friendReqId = await FriendRequest.findOne({
        to: toUser,
        from: req.user._id,
      });
      await FriendRequest.deleteOne({ _id: friendReqId._id });
      // console.log(friendReqId);
      const deleteFromFriendReq = await User.findByIdAndUpdate(req.user._id, {
        $pull: { friendRequests: { $in: [friendReqId._id] } },
      });
      // console.log(deleteFromFriendReq);
      await deleteFromFriendReq.save();
      const deleteToFriendReq = await User.findByIdAndUpdate(toUser, {
        $pull: { friendRequests: { $in: [friendReqId._id] } },
      });

      console.log(deleteToFriendReq, "del");
      await deleteToFriendReq.save();
      // console.log(toUserProfile);
      res.status(200).send({ message: "Request deleted" });
    }

    // console.log(user1);
  } catch (error) {
    // console.log(error);
    next(error);
  }
};

exports.getAllUsersRequest = async (req, res) => {
  const { toUser } = req.params;
  try {
    const friendReq = await FriendRequest.find({
      status: "Pending",
      from: req.user._id,
      to: toUser,
    });
    res.status(200).json({ data: friendReq });
  } catch (error) {
    res.send(error);
  }
};

exports.getReceivedRequest = async (req, res) => {
  try {
    const friendReq = await FriendRequest.find({
      to: req.user._id,
      status: "Pending",
    }).populate("from");
    res.status(200).json({ data: friendReq });
  } catch (error) {
    res.send(error);
  }
};

//accept Friend Request

exports.acceptFriendRequest = async (req, res, next) => {
  const { toUser } = req.params;

  try {
    const friendReq = await FriendRequest.findOneAndUpdate(
      { status: "Pending", from: toUser, to: req.user._id },
      { status: "Accepted" },
      { new: true }
    );
    // console.log(friendReq);
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          friends: toUser,
        },
      },
      { new: true }
    );
    await User.findByIdAndUpdate(
      toUser,
      {
        $push: {
          friends: req.user._id,
        },
      },
      { new: true }
    );
    res.status(200).json({ message: "Friend request accepted." });
  } catch (error) {
    next(error);
  }
};

exports.declineFriendRequest = async (req, res, next) => {
  const { toUser } = req.params;
  const friendReqId = await FriendRequest.findOne({
    to: toUser,
    from: req.user._id,
  });
  await FriendRequest.deleteOne({ _id: friendReqId._id });

  const deleteFromFriendReq = await User.findByIdAndUpdate(req.user._id, {
    $pull: { friendRequests: { $in: [friendReqId._id] } },
  });

  await deleteFromFriendReq.save();
  const deleteToFriendReq = await User.findByIdAndUpdate(toUser, {
    $pull: { friendRequests: { $in: [friendReqId._id] } },
  });

  // console.log(deleteToFriendReq, "del");
  await deleteToFriendReq.save();

  res.status(200).send({ message: "Request deleted" });
};
