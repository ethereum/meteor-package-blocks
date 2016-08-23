/**

@module Ethereum:blocks
*/



/**
The EthBlocks collection, with some ethereum additions.

@class EthBlocks
@constructor
*/



EthBlocks = new Mongo.Collection('ethereum_blocks', {connection: null});

// if(typeof PersistentMinimongo !== 'undefined')
//     new PersistentMinimongo(EthBlocks);


/**
Gives you reactively the lates block.

@property latest
*/
Object.defineProperty(EthBlocks, 'latest', {
    get: function () {
        return EthBlocks.findOne({}, {sort: {number: -1}}) || {};
    },
    set: function (values) {
        var block = EthBlocks.findOne({}, {sort: {number: -1}}) || {};
        values = values || {};
        EthBlocks.update(block._id, {$set: values});
    }
});

/**
Stores all the callbacks

@property _forkCallbacks
*/
EthBlocks._forkCallbacks = [];


/**
Start looking for new blocks

@method init
*/
EthBlocks.init = function(){
    if(typeof web3 === 'undefined') {
        console.warn('EthBlocks couldn\'t find web3, please make sure to instantiate a web3 object before calling EthBlocks.init()');
        return;
    }

    // clear current block list
    EthBlocks.clear();

    Tracker.nonreactive(function() {
        observeLatestBlocks();
    });
};

/**
Add callbacks to detect forks

@method detectFork
*/
EthBlocks.detectFork = function(cb){
    EthBlocks._forkCallbacks.push(cb);
};

/**
Clear all blocks

@method clear
*/
EthBlocks.clear = function(){
    _.each(EthBlocks.find({}).fetch(), function(block){
        EthBlocks.remove(block._id);
    });
};


/**
The global block filter instance.

@property filter
*/
var filter = null;

/**
Update the block info and adds additional properties.

@method updateBlock
@param {Object} block
*/
function updateBlock(block){

    // reset the chain, if the current blocknumber is 100 blocks less 
    if(block.number + 10 < EthBlocks.latest.number)
        EthBlocks.clear();

    block.difficulty = block.difficulty.toString(10);
    block.totalDifficulty = block.totalDifficulty.toString(10);

    web3.eth.getGasPrice(function(e, gasPrice){
        if(!e) {
            block.gasPrice = gasPrice.toString(10);
            EthBlocks.upsert('bl_'+ block.hash.replace('0x','').substr(0,20), block);
        }
    });
};

/**
Observe the latest blocks and store them in the Blocks collection.
Additionally cap the collection to 50 blocks

@method observeLatestBlocks
*/
function observeLatestBlocks(){

    // get the latest block immediately
    web3.eth.getBlock('latest', function(e, block){
        if(!e) {
            updateBlock(block);
        }
    });

    // GET the latest blockchain information
    filter = web3.eth.filter('latest').watch(checkLatestBlocks);

};

/**
The observeLatestBlocks callback used in the block filter.

@method checkLatestBlocks
*/
var checkLatestBlocks = function(e, hash){
    if(!e) {
        web3.eth.getBlock(hash, function(e, block){
            if(!e) {
                var oldBlock = EthBlocks.latest;

                // console.log('BLOCK', block.number);

                // if(!oldBlock)
                //     console.log('No previous block found: '+ --block.number);

                // CHECK for FORK
                if(oldBlock && oldBlock.hash !== block.parentHash) {
                    // console.log('FORK detected from Block #'+ oldBlock.number + ' -> #'+ block.number +'!');

                    _.each(EthBlocks._forkCallbacks, function(cb){
                        if(_.isFunction(cb))
                            cb(oldBlock, block);
                    });
                }

                updateBlock(block);

                // drop the 50th block
                var blocks = EthBlocks.find({}, {sort: {number: -1}}).fetch();
                if(blocks.length >= 5) {
                    var count = 0;
                    _.each(blocks, function(bl){
                        count++;
                        if(count >= 5)
                            EthBlocks.remove({_id: bl._id});
                    });
                }
            }
        });

    // try to re-create the filter on error
    // TODO: want to do this?
    } else {
        filter.stopWatching();
        filter = web3.eth.filter('latest').watch(checkLatestBlocks);
    }
};