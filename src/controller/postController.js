const { Schema } = require("mongoose");
const { findByIdAndDelete, populate } = require("../models/post");
const Post = require("../models/post");
const User = require("../models/users");
const Comment = require("../models/comments");
const Reaction = require("../models/reactions");
const cloudinary = require("cloudinary").v2;
const moment = require("moment");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  api_key: process.env.CLOUDINARY_API_KEY,
});

exports.addNewPost = async (req, res, next) => {
  const { content, image } = req.body;

  try {
    const imageUrl = image && (await cloudinary.uploader.upload(image));
    const post = new Post({
      user: req.user._id,
      content,
      image: imageUrl.url || "",
      createdAt: moment().format("MM/DD/YYYY HH:mm"),
    });
    const newPost = await post.save();
    const addPostInUser = await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: newPost },
    });
    await addPostInUser.save();
    console.log(addPostInUser);
    const fullPost = await newPost
      .populate("user", "firstName lastName profilePicture")
      .execPopulate();
    res.status(200).json({ data: fullPost, message: "Post created" });
  } catch (error) {
    res.send(error);
  }
};

exports.update_post = function (req, res, next) {
  const { content } = req.body;
  const updatedPost = {
    content,
  };
  Post.findByIdAndUpdate(req.params.id, updatedPost, { new: true }).then(
    (update) => {
      res.status(200).json({ message: "Post updated", update });
    }
  );
};

exports.deletePost = function (req, res, next) {
  Post.findByIdAndDelete(req.params.id)
    .then((deletedPost) => {
      res.status(200).json({ message: "Post deleted" });
    })
    .catch((err) => {
      next(err);
    });
};

//all post of users and his friends
exports.getAllPosts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id, "friends");
    const newPost = await Post.find({
      $or: [{ user: user._id }, { user: { $in: user.friends } }],
    })
      .populate({
        path: "user",
      })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "firstName lastName profilePicture",
        },
      })
      .populate({
        path: "reactors",
        populate: {
          path: "reactor",
          select: "firstName lastName profilePicture",
        },
        options: { sort: { _id: "-1" } },
      })
      .sort({ _id: -1 });
    res.status(200).json({ data: newPost });
  } catch (error) {
    next(error);
  }
};

exports.getUsersPost = async (req, res, next) => {
  const id = req.params.id;
  console.log(id);
  try {
    const post = await Post.find({ user: id })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          model: "User",
          select: "firstName ,lastName profilePicture",
        },
      })
      .populate({
        path: "reactors",
        populate: {
          path: "reactor",
          select: "firstName lastName profilePicture",
        },
        options: { sort: { _id: "-1" } },
      })
      .populate({
        path: "user",
        model: "User",
        select: "firstName lastName profilePicture",
      })
      .sort({ _id: -1 });
    res.status(200).json({ data: post });
  } catch (error) {
    next(error);
  }
};

exports.getSinglePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id })
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "firstName lastName profilePicture",
        },
      })
      .populate({
        path: "reactors",
        populate: {
          path: "user",
          model: "User",
        },
      })
      .populate("user", "firstName lastName profilePicture");
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  const { content } = req.body;
  const newComment = new Comment({
    ...req.body,
    content,
    user: req.user._id,
    createdAt: moment().format("MM/DD/YYYY HH:mm"),
    post: req.params.id,
    edited: false,
  });
  // console.log(newComment);
  try {
    const updatedComment = await newComment.save();
    // console.log(updatedComment);
    const insertComment = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $push: { comments: updatedComment },
      },
      { new: true }
    );
    await updatedComment
      .populate("user", "firstName lastName profilePicture")
      .execPopulate();
    return res.status(200).json({ data: updatedComment });
  } catch (error) {
    next(error);
  }
};

exports.addReactions = async (req, res, next) => {
  const { type } = req.body;
  const newReaction = new Reaction({
    ...req.body,
    type,
    post: req.params.id,
    reactor: req.user._id,
  });
  try {
    const isReactorAvailable = await Reaction.findOne({
      post: req.params.id,
      reactor: req.user._id,
    });
    // console.log(isReactorAvailable);
    if (!isReactorAvailable) {
      const savedReactions = await newReaction.save();
      const AddReactionsToPost = await Post.findByIdAndUpdate(
        { _id: req.params.id },
        { $push: { reactors: savedReactions } },
        { new: true }
      );
      await savedReactions.populate("reactor").execPopulate();
      res.status(200).json(savedReactions);
    } else {
      res.status(200).json({ data: "Already Liked the post" });
    }
    // res.status(200);
  } catch (error) {
    next(error);
  }
};

exports.deleteReactions = async (req, res) => {
  const { postId } = req.params;
  // console.log(postId, req.user._id);
  try {
    const reactionsId = await Reaction.findOne(
      { post: postId, reactor: req.user._id },
      "_id"
    );
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $pull: { reactors: { $in: [reactionsId] } },
      },
      { new: true }
    );
    // console.log(post);
    res.status(200).json("succesfully deleted");
  } catch (error) {
    res.send(error);
  }
};
