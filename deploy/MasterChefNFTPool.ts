module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, dev } = await getNamedAccounts()

  const cto = await ethers.getContract("CartoonToken")
  const cardSpec = await ethers.getContract("CardSpec")
  const ncto = await ethers.getContract("NCTO")
  //   const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")
  await deploy("MasterChefNFT", {
    from: deployer,
    contract: "MasterChefNFT",
    args: [
      cto.address,
      ncto.address,
      10, //cto per block
      6719210, // startBlock
      cardSpec.address,
    ],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.tags = ["MasterChefNFT"]
module.exports.dependencies = ["CartoonToken", "NCTO"]
