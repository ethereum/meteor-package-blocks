/**

@module Ethereum:accounts
*/



/**
The accounts collection, with some ethereum additions.

@class Accounts
@constructor
*/

Blocks = new Mongo.Collection('ethereum_blocks', {connection: null});
new PersistentMinimongo(Blocks);


/**
Gives you reactively the lates block.

@property latest
*/
Object.defineProperty(Blocks, 'latest', {
    get: function () {
        return Blocks.findOne({}, {sort: {number: -1}}) || {};
    },
    set: function (values) {
        var block = Blocks.findOne({}, {sort: {number: -1}}) || {};
        values = values || {};
        Blocks.update(block._id, {$set: values});
    }
});

/**
Stores all the callbacks

@property _forkCallbacks
*/
Blocks._forkCallbacks = [];


/**
Start looking for new blocks

@method init
*/
Blocks.init = function(){
    observeLatestBlocks();
};

/**
Add callbacks to detect forks

@method detectFork
*/
Blocks.detectFork = function(cb){
    Blocks._forkCallbacks.push(cb);
};

/**
Observe the latest blocks and store them in the Blocks collection.
Additionally cap the collection to 50 blocks

@method observeLatestBlocks
*/
observeLatestBlocks = function(){

    // get the latest block immediately
    web3.eth.getBlock('latest', function(e, block){
        if(!e) {

            block.difficulty = block.difficulty.toString(10);
            block.totalDifficulty = block.totalDifficulty.toString(10);

            Blocks.upsert('bl_'+ block.number, block);
        }
    });

    // GET the latest blockchain information
    web3.eth.filter('latest').watch(function(e, hash){
        if(!e) {
            web3.eth.getBlock(hash, function(e, block){
                var oldBlock = Blocks.latest;

                // console.log('BLOCK', block.number);

                // CHECK for FORK
                if(oldBlock && oldBlock.hash !== block.parentHash) {
                    // console.log('FORK detected from Block #'+ oldBlock.number + ' -> #'+ block.number +'!');

                    _.each(Blocks._forkCallbacks, function(cb){
                        if(_.isFunction(cb))
                            cb(oldBlock, block);
                    })
                }

                // if(!oldBlock)
                //     console.log('No previous block found: '+ --block.number);

                block.difficulty = block.difficulty.toString(10);
                block.totalDifficulty = block.totalDifficulty.toString(10);

                Blocks.upsert('bl_'+ block.number, block);

                // drop the 50th block
                if(Blocks.find().count() > 50) {
                    var count = 0;
                    _.each(Blocks.find({}, {sort: {number: -1}}).fetch(), function(bl){
                        count++;
                        if(count > 20)
                            Blocks.remove({_id: bl._id});
                    });
                }

                // update the current gas price
                // web3.eth.getGasPrice(function(e, gasPrice){
                //     if(!e) {
                //         // update the latest blockchain entry
                //         var latestBlock = Blocks.findOne({}, {sort: {number: -1}});
                //         LastBlock.update('latest', {$set: {
                //             number: latestBlock.number,
                //             hash: latestBlock.hash,
                //             gasPrice: gasPrice.toString(10),
                //             checkpoint: latestBlock.number // TODO set checkoints more smartly
                //         }});
                //     }
                // });
            });
        }
    });

};