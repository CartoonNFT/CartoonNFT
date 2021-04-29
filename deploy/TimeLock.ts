module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, teamRewardAddress, foundationRewardAddress } = await getNamedAccounts()

  // const cto = await ethers.getContract("CartoonToken")
  const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")

  const reward = (await cto.cap()).div(10)
  const rewardPerQuarter = reward.mul(99).div(100).div(8)
  const startTime = new Date("2021-05-01T00:00:00").getTime()
  await deploy("TeamTimeLock", {
    from: deployer,
    contract: "TimeLock",
    args: [teamRewardAddress, cto.address, rewardPerQuarter, startTime, 0, "Cartoon Token: Team Reward Lock"],
    log: true,
    deterministicDeployment: false,
  })

  await deploy("FoundationTimeLock", {
    from: deployer,
    contract: "TimeLock",
    args: [foundationRewardAddress, cto.address, rewardPerQuarter, startTime, 0, "Cartoon Token: Foundation Reward Lock"],
    log: true,
    deterministicDeployment: false,
  })
}
module.exports.dependencies = ["CartoonToken"]
module.exports.tags = ["TimeLock"]
