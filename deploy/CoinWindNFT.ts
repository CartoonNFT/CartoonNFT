module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev, MDX, WBNB, CoinWind } = await getNamedAccounts()
  const cardSpec = await ethers.getContract("CardSpec")
  const ncto = await ethers.getContract("NCTO")
  const cto = await ethers.getContract("CartoonToken")
  // const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")
  await deploy("CoinWindPoolWithNFT", {
    from: deployer,
    contract: "CoinWindPoolWithNFT",
    args: [
      cto.address,
      ncto.address,
      MDX,
      WBNB,
      CoinWind,
      10, //cto per block
      6719210, // startBlock
      cardSpec.address,
      dev,
    ],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["CoinWindPoolWithNFT"]
module.exports.dependencies = ["CartoonToken", "NCTO", "CardSpec"]
