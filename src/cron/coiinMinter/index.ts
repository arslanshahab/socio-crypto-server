// import { Secrets } from "../../util/secrets";
// import { Application } from "../../app";
// import Web3 from "web3";
// import * as dotenv from "dotenv";
// import { TatumClient } from "../../clients/tatumClient";
// import { RequestData } from "../../util/fetchRequest";
// import { doFetch } from "../../util/fetchRequest";

// dotenv.config();
// const app = new Application();

// (async () => {
//     console.log("starting coiin minter cron job");
//     await Secrets.initialize();
//     console.log("secrets initialized...");
//     const connection = await app.connectDatabase();
//     console.log("connection established...");
//     try {
//         const web3 = new Web3();
//         const amount = (10050000).toString();
//         let mintAmount = web3.utils.toWei(amount);
//         console.log("MINT AMOUNT:", mintAmount);
//         const privateKey = Secrets.minterPrivateKey;
//         console.log("PRIVATE_KEY", privateKey);
//         const encodedParam = web3.eth.abi.encodeParameter("uint256", mintAmount);
//         const payload = {
//             contractAddress: "0x9a016b31B7918d553Fc11056320AE52F1571311C",
//             methodName: "mint",
//             methodABI: {
//                 inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
//                 name: "mint",
//                 outputs: [],
//                 stateMutability: "nonpayable",
//                 type: "function",
//             },
//             params: [encodedParam],
//             amount: mintAmount,
//             fromPrivateKey: privateKey,
//             fee: {
//                 gasLimit: "40000",
//                 gasPrice: "10000",
//             },
//         };
//         const requestData: RequestData = {
//             method: "POST",
//             url: `${TatumClient.baseUrl}/v3/ethereum/smartcontract`,
//             payload,
//             headers: { "x-api-key": Secrets.tatumApiKey, "x-testnet-type": "ethereum-rinkeby" },
//         };

//         const response = await doFetch(requestData);

//         if (response.status !== 200) {
//             const error: any = await response.json();
//             console.log(error);
//             throw new Error(error.message);
//         }

//         const data = await response.json();
//         console.log(data);
//     } catch (error) {
//         console.log(error);
//     }
//     await connection.close();
//     process.exit(0);
// })();
