// Auto-generated from GameAssets.sol — do not edit manually
export const GAME_ASSETS_ABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "admin", "type": "address", "internalType": "address" },
      { "name": "granter", "type": "address", "internalType": "address" },
      { "name": "consumer", "type": "address", "internalType": "address" },
      { "name": "initialTreasury", "type": "address", "internalType": "address" },
      { "name": "initialPaymentTokens", "type": "address[]", "internalType": "address[]" },
      { "name": "initialTokenDecimals", "type": "uint8[]", "internalType": "uint8[]" }
    ],
    "stateMutability": "nonpayable"
  },
  { "type": "function", "name": "ADMIN_ROLE", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "CONSUMER_ROLE", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "DAILY_PASS", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "DEFAULT_ADMIN_ROLE", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "GRANTER_ROLE", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "HINT", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  { "type": "function", "name": "PRICE_DECIMALS", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" },
  { "type": "function", "name": "STREAK_FREEZE", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
  {
    "type": "function", "name": "addPaymentToken",
    "inputs": [
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "decimals", "type": "uint8", "internalType": "uint8" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "assetPacks",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "internalType": "uint256" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "active", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "balances",
    "inputs": [
      { "name": "", "type": "address", "internalType": "address" },
      { "name": "", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  { "type": "function", "name": "consumeHint", "inputs": [{ "name": "user", "type": "address", "internalType": "address" }], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "consumeStreakFreeze", "inputs": [{ "name": "user", "type": "address", "internalType": "address" }], "outputs": [], "stateMutability": "nonpayable" },
  {
    "type": "function", "name": "createAssetPack",
    "inputs": [
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "internalType": "uint256" },
      { "name": "price", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  { "type": "function", "name": "dailyPassDuration", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "dailyPassExpiry",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  { "type": "function", "name": "dailyPassPrice", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "getAllAssetPacks", "inputs": [],
    "outputs": [{
      "name": "", "type": "tuple[]", "internalType": "struct GameAssets.AssetPack[]",
      "components": [
        { "name": "name", "type": "string", "internalType": "string" },
        { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
        { "name": "quantity", "type": "uint256", "internalType": "uint256" },
        { "name": "price", "type": "uint256", "internalType": "uint256" },
        { "name": "active", "type": "bool", "internalType": "bool" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "getAssetPack",
    "inputs": [{ "name": "packId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{
      "name": "", "type": "tuple", "internalType": "struct GameAssets.AssetPack",
      "components": [
        { "name": "name", "type": "string", "internalType": "string" },
        { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
        { "name": "quantity", "type": "uint256", "internalType": "uint256" },
        { "name": "price", "type": "uint256", "internalType": "uint256" },
        { "name": "active", "type": "bool", "internalType": "bool" }
      ]
    }],
    "stateMutability": "view"
  },
  { "type": "function", "name": "getAssetPackCount", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "getBalance",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "getDailyPassExpiry",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "getHintBalance",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  { "type": "function", "name": "getPaymentTokenCount", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  {
    "type": "function", "name": "getRoleAdmin",
    "inputs": [{ "name": "role", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "getStreakFreezeBalance",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "grantAsset",
    "inputs": [
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "grantAssetPack",
    "inputs": [
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "packId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "grantDailyPass",
    "inputs": [{ "name": "to", "type": "address", "internalType": "address" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "grantRole",
    "inputs": [
      { "name": "role", "type": "bytes32", "internalType": "bytes32" },
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "hasActiveDailyPass",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "hasRole",
    "inputs": [
      { "name": "role", "type": "bytes32", "internalType": "bytes32" },
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "isPaymentToken",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "paymentTokens",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "purchaseAsset",
    "inputs": [
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "internalType": "uint256" },
      { "name": "paymentToken", "type": "address", "internalType": "address" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "purchaseAssetPack",
    "inputs": [
      { "name": "packId", "type": "uint256", "internalType": "uint256" },
      { "name": "paymentToken", "type": "address", "internalType": "address" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "purchaseDailyPass",
    "inputs": [{ "name": "paymentToken", "type": "address", "internalType": "address" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "removePaymentToken",
    "inputs": [{ "name": "token", "type": "address", "internalType": "address" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "renounceRole",
    "inputs": [
      { "name": "role", "type": "bytes32", "internalType": "bytes32" },
      { "name": "callerConfirmation", "type": "address", "internalType": "address" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "revokeRole",
    "inputs": [
      { "name": "role", "type": "bytes32", "internalType": "bytes32" },
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "setDailyPassDuration",
    "inputs": [{ "name": "duration", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "setDailyPassPrice",
    "inputs": [{ "name": "price", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "setUnitPrice",
    "inputs": [
      { "name": "assetType", "type": "bytes32", "internalType": "bytes32" },
      { "name": "price", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "supportsInterface",
    "inputs": [{ "name": "interfaceId", "type": "bytes4", "internalType": "bytes4" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "tokenDecimals",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
    "stateMutability": "view"
  },
  { "type": "function", "name": "treasury", "inputs": [], "outputs": [{ "name": "", "type": "address", "internalType": "address" }], "stateMutability": "view" },
  {
    "type": "function", "name": "unitPrices",
    "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "updateAssetPack",
    "inputs": [
      { "name": "packId", "type": "uint256", "internalType": "uint256" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "active", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "updateTreasury",
    "inputs": [{ "name": "newTreasury", "type": "address", "internalType": "address" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "event", "name": "AssetConsumed",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "assetType", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "AssetGranted",
    "inputs": [
      { "name": "to", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "assetType", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "AssetPackCreated",
    "inputs": [
      { "name": "packId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "name", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "assetType", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "AssetPackPurchased",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "packId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "paymentToken", "type": "address", "indexed": false, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "AssetPackUpdated",
    "inputs": [
      { "name": "packId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "active", "type": "bool", "indexed": false, "internalType": "bool" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "AssetPurchased",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "assetType", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "quantity", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "totalPrice", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "paymentToken", "type": "address", "indexed": false, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "DailyPassDurationSet",
    "inputs": [{ "name": "duration", "type": "uint256", "indexed": false, "internalType": "uint256" }],
    "anonymous": false
  },
  {
    "type": "event", "name": "DailyPassGranted",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "expiry", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "DailyPassPriceSet",
    "inputs": [{ "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }],
    "anonymous": false
  },
  {
    "type": "event", "name": "DailyPassPurchased",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "expiry", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "paymentToken", "type": "address", "indexed": false, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "PaymentTokenAdded",
    "inputs": [
      { "name": "token", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "decimals", "type": "uint8", "indexed": false, "internalType": "uint8" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "PaymentTokenRemoved",
    "inputs": [{ "name": "token", "type": "address", "indexed": false, "internalType": "address" }],
    "anonymous": false
  },
  {
    "type": "event", "name": "RoleAdminChanged",
    "inputs": [
      { "name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "previousAdminRole", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "newAdminRole", "type": "bytes32", "indexed": true, "internalType": "bytes32" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "RoleGranted",
    "inputs": [
      { "name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "account", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "sender", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "RoleRevoked",
    "inputs": [
      { "name": "role", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "account", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "sender", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "TreasuryUpdated",
    "inputs": [
      { "name": "oldTreasury", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "newTreasury", "type": "address", "indexed": false, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "UnitPriceSet",
    "inputs": [
      { "name": "assetType", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  { "type": "error", "name": "AccessControlBadConfirmation", "inputs": [] },
  {
    "type": "error", "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      { "name": "account", "type": "address", "internalType": "address" },
      { "name": "neededRole", "type": "bytes32", "internalType": "bytes32" }
    ]
  },
  {
    "type": "error", "name": "SafeERC20FailedOperation",
    "inputs": [{ "name": "token", "type": "address", "internalType": "address" }]
  }
] as const;
