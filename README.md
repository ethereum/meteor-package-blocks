# Ethereum blocks

Provides you with an `Blocks` collection, which stores the last 50 blocks.

You can query blocks like any other Meteor collection.

## Usage

Initialize Blocks on the start of your application, as soon as you have a ethereum connection:

```js
Blocks.init();
```

### Last block

To get the latest block use:

```js
Blocks.latest;
```

Note this property is reactive, so it will re-run your reactive functions, e.g. when used in template helpers.

In case you want to update the latest block you can change properties as follows:

```js
Blocks.latest = {hash: '12345'};
```

This would only change the hash property of the latest block, but leave all other properties as is.

### Detecting forks

You can call `Blocks.detectFork(callback)` to detect chain re-organisation (forks), while your applications is running.
This detection, is checking the new incoming blocks `parentHash`, with the last known block you have.

**Note** The fork detection can currently be wrong, when you're importing blocks, as they can come in different orders.

```js
Blocks.detectFork(function(oldBlock, newBlock){
  // this callback will be fired with the old block we knew and the new block.
});
```

Note you can call `Blocks.detectFork(cb)` mutliple times, to add multiple callbacks.