const User = require('../models/userModel')
const Bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const NodeRSA = require('node-rsa')

const userName = process.env.Passwords_App_Username

const createUser = async (req, res, next) => {
    const { name, password } = req.body
    let hashedPassword = ''
    try {
        hashedPassword = await Bcrypt.hash(password, 10)
        const user = await new User({
            name,
            password: hashedPassword
        })
        await user.save()
    } catch(err) {
        console.log(err)
    }
    
    res.status(200).json({message: "working"})
} 

const login = async (req, res, next) => {
    const {password} = req.body
    let user 
    try {
        user = await User.findOne({name : userName})  
    }catch(err) {
        console.log(err)
    }
    if(!user) {
        res.status(400).json({message: "User not found"})
        return
    }
    
    try {
        if(await Bcrypt.compare(password, user.password)) {
            const yz = {
                name: userName
            }
            const accessToken = jwt.sign(yz, 'wearecoders')
            return res.status(200).json({
                    message: "Logged In",
                    accessToken
                })
        }
        else {
            res.status(400).json({message: "Wrong password"})
        }
    }catch(err) {
        res.status(400).json({message: "login failed"})
        console.log(err)
    }
}

const addPassword = async (req, res, next) => {
    const {title, username, password} = req.body

    const key_public = new NodeRSA(process.env.PUBLIC_KEY.replace(/\\n/g, '\n'))
    const encryptedPassword = key_public.encrypt(password, 'base64')

    try {
        const user = await User.findOne({name : userName})
        const list = user.passwordList
        const temp = list.filter((p) => {
            if(p.title === title && p.username === username)
                return true
            return false
        })
        if(temp.length > 0) 
            return res.status(409).json({message: "password exists"})
        
        user.passwordList.push({
            title,
            username,
            password: encryptedPassword
        })
        user.save()
        res.status(200).json({message: "Password added successfully !"})
        return
    }catch(err) {
        console.log(err)
    }
}

const deletePassword = async (req, res, next) => {
    const {title, username} = req.body
    const user = await User.findOne({name: userName})
    if(!user) return res.status(400).json({message: "User not found"})

    try {
        await user.updateOne({$pull :{'passwordList': {title: title, username: username}}})
        user.save()
        return res.status(200).json({message: 'Password Deleted successfully !'})
    }catch(err) {
        console.log(err)
    } 
    return res.status(400).json({message: 'Password Delete failed'})
}

const editPassword = async (req, res, next) => {
    const {title, oldUsername, oldPassword, newUsername, password} = req.body

    const key_public = new NodeRSA(process.env.PUBLIC_KEY.replace(/\\n/g, '\n'))
    const key_private = new NodeRSA(process.env.PRIVATE_KEY.replace(/\\n/g, '\n'))
    const encryptedPassword = key_public.encrypt(password, 'base64')

    try {
        const user = await User.findOne({name: userName})
        if(!user) return res.status(400).json({message: "User not found"})

        const list = user.passwordList
        const temp = list.filter((p) => {
            if(p.title === title && p.username === newUsername)
                return true
            return false
        })
        
         //Another password has same username with same title so username can't be changed
        if(temp.length > 0) {

             //newPassword is similar to the old password so password can't be changed
            if(oldPassword === password) {  
                return res.status(409).json({message: "No Changes", list})
            }

            //newPassword is different from old password
            await User.updateOne(
                    {name: userName, 'passwordList.title' : title, 'passwordList.username': oldUsername},
                    {$set: {'passwordList.$.password': encryptedPassword}}
                )
            
            const item = {
                username: oldUsername,
                password: password
            }
            list.map(p => p.password = key_private.decrypt(p.password, 'utf8'))
            return res.status(200).json({message: 'userPassword Edited', item, list})
        }

        //newUsername and newPassword both are different
        //detailed: no other password has same username as newUsername and current userpassword of 
        //requested password is different from newUserpassword 
        await User.updateOne(
            {name: userName, 'passwordList.title' : title, 'passwordList.username': oldUsername},
            {$set: {'passwordList.$.username': newUsername, 'passwordList.$.password': encryptedPassword}}
        )

        const item = {
            username: newUsername,
            password: password
        }
        res.status(200).json({message: "Edited", item, list})
        return
    }catch(err) {
        console.log(err)
    }

    res.status(400).json({message: "Editing password failed"})
    return
}

const getPasswordList = async (req, res, next) => {
    const user = await User.findOne({name: userName})
    if(!user) return res.status(400).json({message: "User not found"})

    const key_private = new NodeRSA(process.env.PRIVATE_KEY.replace(/\\n/g, '\n'))

    let list = user.passwordList
    if(list.length>0) {
        list.map(p => p.password = key_private.decrypt(p.password, 'utf8'))
    }
    res.status(200).json({list})
}

exports.createUser = createUser
exports.login = login
exports.addPassword = addPassword
exports.deletePassword = deletePassword
exports.editPassword = editPassword
exports.getPasswordList = getPasswordList
