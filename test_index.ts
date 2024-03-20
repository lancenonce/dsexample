import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/packages/core"
import { signerToEcdsaValidator } from "@zerodev/plugins/ecdsa"
import { http, encodeFunctionData, parseAbi, createPublicClient } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import type {
    UserOperation,
    EntryPointVersion
} from "permissionless/types"
 
// The NFT contract we will be interacting with
const contractAddress = '0x34bE7f35132E97915633BC1fc020364EA5134863'd
const contractABI = parseAbi([
  'function mint(address _to) public',
  'function balanceOf(address owner) external view returns (uint256 balance)'
])
 
const PROJECT_ID = 'b5486fa4-e3d9-450b-8428-646e757c10f6'
const BUNDLER_RPC = `https://rpc.zerodev.app/api/v2/bundler/${PROJECT_ID}`
const PAYMASTER_RPC = `https://rpc.zerodev.app/api/v2/paymaster/${PROJECT_ID}`
 
const main = async () => {
  // Construct a signer
  const privateKey = generatePrivateKey()
  const signer = privateKeyToAccount(privateKey)
 
  // Construct a public client
  const publicClient = createPublicClient({
    transport: http(BUNDLER_RPC),
  })
 
  // Construct a validator
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
  })
 
  // Construct a Kernel account
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
  })
 
  // Construct a Kernel account client
  const kernelClient = createKernelAccountClient({
    account,
    chain: polygonMumbai,
    transport: http(BUNDLER_RPC),
    sponsorUserOperation: async ({ userOperation }: { userOperation: UserOperation<"v0.6"> }) => {
        const zerodevPaymaster = createZeroDevPaymasterClient({
        chain: polygonMumbai,
        transport: http(PAYMASTER_RPC),
      })
      return zerodevPaymaster.sponsorUserOperation({
        userOperation
      })
    }
  })
 
//   const accountAddress = kernelClient.account.address
  if (kernelClient.account) {
    const accountAddress = kernelClient.account.address
    console.log("My account:", accountAddress)
  }
 
  // Send a UserOp
  console.log('Minting NFT...')
  await kernelClient.sendTransaction({
    to: contractAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: contractABI,
      functionName: "mint",
      args: [accountAddress],
    }),
  })
 
  console.log(`See NFT here: https://mumbai.polygonscan.com/address/${accountAddress}#nfttransfers`)
}
 
main()