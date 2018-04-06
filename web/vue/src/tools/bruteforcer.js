import {post} from './ajax'
let shuffle = require('shuffle-array')

/**
 * Market brute forcer (proof of concept)
 * @author David Valin <hola@davidvalin.com>
 */
 export class MarketBacktestBruteforcer {
   /**
    * Initializes the market brute forcer
    */
   constructor() {
     this.config = {
       paramsConfig: [],
       bruteforceParamsPermutations: []
     };
   }

   /**
    * From a list of params, prepare their param names
    */
   prepareParamNames(params) {
     const paramNames = Object.keys(params);
     let subParams, i, i2;
     for (i = 0; i < paramNames.length; i++) {
       if (typeof(params[paramNames[i]]) == 'object') {
         subParams = Object.keys(params[paramNames[i]]);
         for (i2 = 0; i2 < subParams.length; i2++) {
           paramNames.push(paramNames[i]+'.'+subParams[i2]);
           if (i2+1==subParams.length) {
             paramNames.splice(i, 1);
           }
         }
       }
     }
     return paramNames;
   }

   /**
    * Transforms '.' notation to JSON object
    */
   transformParamNames(params) {
     let finalParams = {}, paramsKeys = Object.keys(params), rootKey, childKey, dotI, i;
     for (i = 0; i < paramsKeys.length; i++) {
       dotI = paramsKeys[i].indexOf('.');
       if (dotI != -1) {
         rootKey = paramsKeys[i].slice(0,dotI);
         childKey = paramsKeys[i].slice(dotI+1, paramsKeys[i].length);
         if (!finalParams[rootKey]) {
           finalParams[rootKey] = {};
         }
         finalParams[rootKey][childKey] = params[rootKey+'.'+childKey]
       } else {
         finalParams[paramsKeys[i]] = params[paramsKeys[i]];
       }
     }
     return finalParams;
   }

   /**
    * Prepares the parameter value ranges to test from a strategy
    * @param params : the params used to prepare the ranges to test
    * @return paramsConfig : the configuration of params to brute force
    */
   prepareRangesFromParams(params) {
    //  console.log('Preparing the value ranges from those params: ', params);
     const paramNames = this.prepareParamNames(params);
     let paramsConfig = [], dotPos, paramValue;
     for (let i = 0; i < paramNames.length; i++) {
       dotPos = paramNames[i].indexOf('.');
       paramValue = dotPos != -1 ? eval('params["'+paramNames[i].slice(0, dotPos)+'"]["'+paramNames[i].slice(dotPos+1, paramNames[i].length)+'"]') : params[paramNames[i]];
       paramsConfig.push({
         name:  paramNames[i],
         from:  paramValue - 2,      // TODO: this has to be dynamic and valid
         to:    paramValue + 2,     // TODO: this has to be dynamic and valid
         step:  1                    // TODO: this has to be dynamic and valid
       });
     }
     return paramsConfig;
   }

   /**
    * Configures the market bruteforcer
    * @param strategyParams : The strategy default parameters to use to configure the brute forcer
    */
   configure(strategyParams) {
     // Configure the param value ranges
     this.config.paramsConfig = this.prepareRangesFromParams(strategyParams);
     this.config.bruteforceParamsPermutations = [];

     // Permute the parameters
     let permuteParams = this.permuteParams();
     permuteParams = shuffle(permuteParams);
     // For each parameter combination
     for (let i = 0; i < permuteParams.length; i++) {
       // Push test combinations
       this.config.bruteforceParamsPermutations.push({
        //  currency:  this.config.pairList[i].slice(0,3),
        //  asset:     this.config.pairList[i].slice(3,6),
         params:    this.transformParamNames(permuteParams[i])
       });
     }
   }

   /**
    * Retrieves the params names
    */
   getParamsName() {
     return this.paramsConfig.map(function(paramsSet) {
       return paramsSet['name'];
     });
   }

   /**
    * Prepares the parameters values from a configuration of parameters
    */
   prepareParamsValues(paramsConfig) {
     let paramsValues = {}, i, i2;

     for (i = 0; i < paramsConfig.length; i++) {
       const pmConf = paramsConfig[i];
       paramsValues[pmConf['name']] = [];
       // Prepare "from" -- "to" combinations
       if (typeof(pmConf['from']) != 'undefined' && typeof(pmConf['to']) != 'undefined') {
          for (i2 = pmConf['from']; i2 <= pmConf['to']; i2=i2+pmConf['step']) {
            paramsValues[pmConf['name']].push(i2);
          }
       // Prepare "values" combinations
       } else if (pmConf['values']) {
          for (i2 = 0; i2 < pmConf['values'].length; i2++) {
            paramsValues[pmConf['name']].push(pmConf['values'][i2]);
          }
       }
     }
     return paramsValues;
   }

   /**
    * Using the bruteforce params configuration, permutes the params
    */
   permuteParams(paramCombinationNames, inputParamsValues, paramsCombinations, permuted) {
     const self = this;
     // Grab the paramsConfig first
     if (!inputParamsValues) {
       inputParamsValues = this.prepareParamsValues(this.config.paramsConfig);
     }
     // Store the original list of parameter names to permute
     if (!paramCombinationNames) {
       paramCombinationNames = Object.keys(inputParamsValues);
     }
     if (!paramsCombinations) {
       paramsCombinations = {};
     }

     // Initialize an empty set of permutations
     if (!permuted) {
       console.log(' + Permuting params values from input params values: ', inputParamsValues);
       permuted = [];
     }
     const inputParamNames = Object.keys(inputParamsValues);

     let i, i2, valuesToConsider, combinationMade, newParamsCombinations, newInputParamsValues;
     for (i = 0; i < inputParamNames.length; i++) {
       if (typeof(paramsCombinations[inputParamNames[i]]) == 'undefined') {
         const inputParamValues = inputParamsValues[inputParamNames[i]];
         for (i2 = 0; i2 < inputParamValues.length; i2++) {
           (function(paramCombinationNames, inputParamsValues, paramsCombinations, permuted, valuesToConsider) {
             combinationMade = false;
             // Only store a permutation when we are considering values for all inputs
             valuesToConsider = inputParamsValues[inputParamNames[i]].slice(i2+1, inputParamsValues[inputParamNames[i]].length);
             inputParamsValues[inputParamNames[i]] = valuesToConsider;
             // Prepare a new set of parameter combinations
             newParamsCombinations = Object.assign({}, paramsCombinations);
             newParamsCombinations[inputParamNames[i]] = inputParamValues[i2];
             // Is the parameter combinations complete? Then push it to the permuted list
             if (Object.keys(newParamsCombinations).length == paramCombinationNames.length) {
               combinationMade = true;
             }
             if (combinationMade) {
               permuted.push(newParamsCombinations);
               newParamsCombinations = {};
             }
             newInputParamsValues = Object.assign({}, inputParamsValues);
             // Did we finish all possible values for a parameter?
             if (newInputParamsValues[inputParamNames[i]].length == 0) {
               // Now we remove the parameter considered from the recursive combinations
               delete newInputParamsValues[inputParamNames[i]];
             }
            // Do we have any param value to consider in this iteration?
            if (!combinationMade && Object.keys(newInputParamsValues).length > 0) {
              self.permuteParams(paramCombinationNames, newInputParamsValues, newParamsCombinations, permuted);
            }
          })(paramCombinationNames, inputParamsValues, paramsCombinations, permuted, valuesToConsider);
         }
       }
     }
     return permuted;
   }

   /**
    * Checks wether the brute forcer is configured or not
    */
   isConfigured() {
    return (this.config && this.config.bruteforceParamsPermutations && this.config.bruteforceParamsPermutations.length > 0 ? true : false);
   }
 }
