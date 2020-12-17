const bcrypt = require("bcryptjs");
const User = require("../models/users");
const FriendRequest = require("../models/friendRequest");
const { update } = require("../models/friendRequest");
const cloudinary = require("cloudinary").v2;
const moment = require("moment");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  api_key: process.env.CLOUDINARY_API_KEY,
});

exports.signUp = async function (req, res, next) {
  console.log("signup");
  const { day, month, year } = req.body;
  const user = new User({
    ...req.body,
    birthday: { birthday: { day, month, year } },
    createdAt: moment().format("MM/DD/YYYY HH:mm"),
  });
  try {
    const token = await user.generateAuthToken();
    user.password = await bcrypt.hash(user.password, 10);
    // console.log(createdAt);
    await user.save();
    res.status(200).send({ user, token });
  } catch (error) {
    // console.log(error)
    res.send(error);
  }
};

exports.login = async function (req, res, next) {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  //   console.log(user);
  if (!user) {
    return res.status(400).send("Email doesnot exits");
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send("Please enter correct Password");
  }

  try {
    const token = await user.generateAuthToken();
    res.status(200).send({ user, token });
  } catch (error) {
    res.send(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    req.user.tokens = req.user.tokens.filter((availableToken) => {
      return availableToken.token !== req.token;
    });
    req.user.save();
    next();
    res.status(200).send("Lgged Out successfully");
  } catch (error) {
    res.status(400).send(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  const user = await User.find({});
  console.log(user);
  try {
    res.send(user);
  } catch (error) {
    next(error);
  }
};

exports.editUsers = async (req, res) => {
  try {
    if (req.body.coverPhoto) {
      const coverPic =
        req.body.coverPhoto &&
        (await cloudinary.uploader.upload(req.body.coverPhoto));
      req.body.coverPhoto = coverPic.url;
    }
    if (req.body.profilePicture) {
      const profilePicture =
        req.body.profilePicture &&
        (await cloudinary.uploader.upload(req.body.profilePicture));
      req.body.profilePicture = profilePicture.url;
    }
    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
    });
    res.status(200).send({ data: user, message: "Updated succesfully" });
    // const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    //   new: true,
    // });
  } catch (error) {
    req.send(error);
  }
};

exports.getUser = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const user = await User.findById(id);
    res.status(200).json({ data: user });
  } catch (error) {
    res.send(error);
  }
};

exports.getFriendsSuggestions = async (req, res, next) => {
  User.findOne({ _id: req.user._id }).then((user) => {
    FriendRequest.find({ $or: [{ from: user._id }, { to: user._id }] }).then(
      (fr) => {
        User.find({
          _id: { $nin: user.friends, $ne: user._id },
          friendRequests: { $nin: fr },
        })
          .limit(Number(req.query.limit))
          .populate({
            path: "friendRequests",
            populate: {
              path: "from",
              model: "User",
              select: "first_name last_name ",
            },
          })
          .populate({
            path: "friendRequests",
            populate: {
              path: "to",
              model: "User",
              select: "first_name last_name ",
            },
          })
          .then((people) => {
            res.status(200).json({ data: people });
          })
          .catch((error) => {
            next(error);
          });
      }
    );
  });
};

exports.getUserFullDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "posts",
        populate: [
          {
            path: "comments",
            populate: {
              path: "user",
              model: "User",
              select: "firstName ,lastName profilePicture",
            },
          },
          {
            path: "reactors",
            populate: {
              path: "reactor",
              model: "User",
              select: "firstName ,lastName profilePicture",
            },
          },
        ],
      })
      .populate("friends")
      .populate("friendsRequest");
    console.log(user);
    res.status(200).json({ data: user });
  } catch (error) {
    res.send(error);
  }
};

exports.searchPeople = async (req, res) => {
  const search = req.query.q;
  User.findOne({ _id: req.user._id }).then((user) => {
    User.find(
      {
        _id: { $nin: user.friends, $ne: user._id },
        $or: [
          { firstName: new RegExp(search, "i") },
          { lastName: new RegExp(search, "i") },
        ],
      },
      "firstName lastName profilePicture "
    )
      .limit(Number(req.query.limit))
      .then((people) => {
        res.status(200).json({ data: people });
      })
      .catch((error) => {
        next(error);
      });
  });
};
