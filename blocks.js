/**

@module Ethereum:blocks
*/



/**
The EthBlocks collection, with some ethereum additions.

@class EthBlocks
@constructor
*/

EthBlocks = new Mongo.Collection('ethereum_blocks', {connection: null});
new PersistentMinimongo(EthBlocks);


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
    observeLatestBlocks();
};

/**
Add callbacks to detect forks

@method detectFork
*/
EthBlocks.detectFork = function(cb){
    EthBlocks._forkCallbacks.push(cb);
};

/**
Update the block info and adds additional properties.

@method updateBlock
@param {Object} block
*/
function updateBlock(block){
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
    web3.eth.filter('latest').watch(function(e, hash){
        if(!e) {
            web3.eth.getBlock(hash, function(e, block){
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
                if(EthBlocks.find().count() > 50) {
                    var count = 0;
                    _.each(EthBlocks.find({}, {sort: {number: -1}}).fetch(), function(bl){
                        count++;
                        if(count > 20)
                            EthBlocks.remove({_id: bl._id});
                    });
                }
            });
        }
    });

};