/**
 * userController.js
 * @description : exports action methods for user.
 */

const User = require('../../model/user');
const userSchemaKey = require('../../utils/validation/userValidation');
const validation = require('../../utils/validateRequest');
const dbService = require('../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const deleteDependentService = require('../../utils/deleteDependent');
const utils = require('../../utils/common');

const common = require('../../utils/common');
const Wallet = require('../../model/wallet');
const walletSchemaKey = require('../../utils/validation/walletValidation');
const orderConstant = require('../../constants/order'); 
   
/**
 * @description : create document of User in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created User. {status, message, data}
 */ 
const addUser = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validate = validation.validateParamsWithJoi(dataToCreate, userSchemaKey.schemaKeys);
    if (!validate.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validate.message}` });
    } 
    dataToCreate = new User(dataToCreate);
    let createdResult = await dbService.create(User, dataToCreate);
    if (createdResult) {   
      let dataToCreate = { ...req.body || {} };
      let validate = validation.validateParamsWithJoi(dataToCreate, walletSchemaKey.schemaKeys);
      if (!validate.isValid) {
        return res.validationError({ message : `Invalid values in parameters, ${validate.message}` });
      } 
      dataToCreate = new Wallet(dataToCreate);
      let createdResult = await dbService.create(Wallet, dataToCreate);
      if (createdResult) {   
        return  res.success({ data : createdResult });
      }
      return res.badRequest();
      return  res.success({ data : createdResult });
    }
    return res.badRequest();
  } 
  catch (error){ 
    return  res.status(500).send({
      message: 'Internal Server Error',
      data: null 
    });
  }

};
    
/**
 * @description : create multiple documents of User in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Users. {status, message, data}
 */
const bulkInsertUser = async (req,res)=>{
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [ ...req.body.data ];
    for (let i = 0;i < dataToCreate.length;i++){
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user.id
      };
    }
    let createdUsers = await dbService.create(User,dataToCreate);
    createdUsers = { count: createdUsers ? createdUsers.length : 0 };
    return res.success({ data:{ count:createdUsers.count || 0 } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : find all documents of User from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found User(s). {status, message, data}
 */
const findAllUser = async (req,res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userSchemaKey.findFilterKeys,
      User.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly){
      let totalRecords = await dbService.count(User, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundUsers = await dbService.paginate( User,query,options);
    if (!foundUsers || !foundUsers.data || !foundUsers.data.length){
      return res.recordNotFound(); 
    }
    return res.success({ data :foundUsers });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
        
/**
 * @description : find document of User from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found User. {status, message, data}
 */
const getUser = async (req,res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message : 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundUser = await dbService.findOne(User,query, options);
    if (!foundUser){
      return res.recordNotFound();
    }
    return res.success({ data :foundUser });
  }
  catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : returns total number of documents of User.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getUserCount = async (req,res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedUser = await dbService.count(User,where);
    return res.success({ data : { count: countedUser } });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : update document of User with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated User.
 * @return {Object} : updated User. {status, message, data}
 */
const updateUser = async (req,res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedUser = await dbService.updateOne(User,query,dataToUpdate);
    if (!updatedUser){
      return res.recordNotFound();
    }
    return res.success({ data :updatedUser });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};

/**
 * @description : update multiple records of User with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Users.
 * @return {Object} : updated Users. {status, message, data}
 */
const bulkUpdateUser = async (req,res)=>{
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate['addedBy'];
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = { 
        ...req.body.data,
        updatedBy : req.user.id
      };
    }
    let updatedUser = await dbService.updateMany(User,filter,dataToUpdate);
    if (!updatedUser){
      return res.recordNotFound();
    }
    return res.success({ data :{ count : updatedUser } });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : partially update document of User with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated User.
 * @return {obj} : updated User. {status, message, data}
 */
const partialUpdateUser = async (req,res) => {
  try {
    if (!req.params.id){
      res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    delete req.body['addedBy'];
    let dataToUpdate = {
      ...req.body,
      updatedBy:req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message : `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = { _id:req.params.id };
    let updatedUser = await dbService.updateOne(User, query, dataToUpdate);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedUser });
  } catch (error){
    return res.internalServerError({ message:error.message });
  }
};
    
/**
 * @description : deactivate document of User from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of User.
 * @return {Object} : deactivated User. {status, message, data}
 */
const softDeleteUser = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedUser = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!updatedUser){
      return res.recordNotFound();
    }
    return res.success({ data:updatedUser });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : delete document of User from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted User. {status, message, data}
 */
const deleteUser = async (req,res) => {
  try {
    if (!req.params.id){
      return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
    }
    const query = { _id:req.params.id };
    let deletedUser;
    if (req.body.isWarning) { 
      deletedUser = await deleteDependentService.countUser(query);
    } else {
      deletedUser = await deleteDependentService.deleteUser(query);
    }
    if (!deletedUser){
      return res.recordNotFound();
    }
    return res.success({ data :deletedUser });
  }
  catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : delete documents of User in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyUser = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    let deletedUser;
    if (req.body.isWarning) {
      deletedUser = await deleteDependentService.countUser(query);
    }
    else {
      deletedUser = await deleteDependentService.deleteUser(query);
    }
    if (!deletedUser){
      return res.recordNotFound();
    }
    return res.success({ data :deletedUser });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};
    
/**
 * @description : deactivate multiple documents of User from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of User.
 * @return {Object} : number of deactivated documents of User. {status, message, data}
 */
const softDeleteManyUser = async (req,res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = { _id:{ $in:ids } };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedUser = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data:updatedUser });
  } catch (error){
    return res.internalServerError({ message:error.message }); 
  }
};

module.exports = {
  addUser,
  bulkInsertUser,
  findAllUser,
  getUser,
  getUserCount,
  updateUser,
  bulkUpdateUser,
  partialUpdateUser,
  softDeleteUser,
  deleteUser,
  deleteManyUser,
  softDeleteManyUser    
};