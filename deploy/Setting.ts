module.exports = async ({ ethers, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer, WBNB, USDT, MDXFactory } = await getNamedAccounts()
  const { dev } = await ethers.getNamedSigners()
  const { airDrop, consultant, cooperations, operations, IDO, teamRewardAddress, foundationRewardAddress } = await getNamedAccounts()

  const mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)

  const cardSpec = await ethers.getContract("CardSpec")
  const cto = await ethers.getContract("CartoonToken")
  // const cto = await ethers.getContractAt("CartoonToken", "0x532b8a798e920f4ebee2b0c6cc400d2933971004")

  const ncto = await ethers.getContract("NCTO")
  const shop = await ethers.getContract("Shop")
  const swapMarket = await ethers.getContract("SwapMarket")
  const synthesisMarketV1 = await ethers.getContract("SynthesisMarketV1")
  const synthesisMarketV2 = await ethers.getContract("SynthesisMarketV2")
  const synthesisMarketV3 = await ethers.getContract("SynthesisMarketV3")
  const coinWindPool = await ethers.getContract("CoinWindPool")
  const coinWindPoolNFT = await ethers.getContract("CoinWindPoolWithNFT")
  const masterChef = await ethers.getContract("MasterChef")
  // const teamTimeLock = await ethers.getContract("TeamTimeLock")
  // const foundationTimeLock = await ethers.getContract("FoundationTimeLock")

  // timelock
  // await cto.connect(dev).grantRole(await cto.MINT_ROLE(), deployer)
  // const lockReward = (await cto.cap()).div(10).mul(99).div(100)
  // await cto.mint(teamTimeLock.address, lockReward)
  // await cto.mint(foundationTimeLock.address, lockReward)

  // //air drop
  // const airDropReward = (await cto.cap()).mul(2).div(100)
  // await cto.mint(airDrop, airDropReward)

  // //consultant
  // const consultantReward = (await cto.cap()).mul(2).div(100)
  // await cto.mint(consultant, consultantReward)
  // //cooperations
  // const cooperationsReward = (await cto.cap()).mul(7).div(100)
  // await cto.mint(cooperations, cooperationsReward)
  // //operations
  // const operationsReward = (await cto.cap()).mul(6).div(100)
  // await cto.mint(operations, operationsReward)
  // //IDO
  // const IDOReward = (await cto.cap()).mul(13).div(100)
  // await cto.mint(IDO, IDOReward)

  // await cto.connect(dev).revokeRole(await cto.MINT_ROLE(), deployer)

  // add card types
  await cardSpec.addCardType(1000, 1000, ethers.utils.formatBytes32String("role1"))
  await cardSpec.addCardType(1001, 1000, ethers.utils.formatBytes32String("role2"))
  await cardSpec.addCardType(1002, 1000, ethers.utils.formatBytes32String("role3"))
  await cardSpec.addCardType(1003, 1000, ethers.utils.formatBytes32String("role4"))
  await cardSpec.addCardType(1004, 1000, ethers.utils.formatBytes32String("role5"))

  await cardSpec.addCardType(1005, 1000, ethers.utils.formatBytes32String("role6"))
  await cardSpec.addCardType(1006, 1000, ethers.utils.formatBytes32String("role7"))
  await cardSpec.addCardType(1007, 1000, ethers.utils.formatBytes32String("role8"))
  await cardSpec.addCardType(1008, 1000, ethers.utils.formatBytes32String("role9"))
  await cardSpec.addCardType(1009, 1000, ethers.utils.formatBytes32String("role10"))

  await cardSpec.addCardType(1010, 1000, ethers.utils.formatBytes32String("role11"))
  await cardSpec.addCardType(1011, 1000, ethers.utils.formatBytes32String("role12"))
  await cardSpec.addCardType(1012, 1000, ethers.utils.formatBytes32String("role13"))
  await cardSpec.addCardType(1013, 1000, ethers.utils.formatBytes32String("role14"))
  await cardSpec.addCardType(1014, 1000, ethers.utils.formatBytes32String("role15"))

  await cardSpec.addCardType(2000, 2000, ethers.utils.formatBytes32String("lv1"))
  await cardSpec.addCardType(2000, 2001, ethers.utils.formatBytes32String("lv2"))
  await cardSpec.addCardType(2000, 2002, ethers.utils.formatBytes32String("lv3"))

  // mint card to shop
  await ncto.grantRole(await ncto.MINT_ROLE(), shop.address)
  await shop.setUnitPrice(ethers.utils.parseUnits("1", 18))
  for (let i = 0; i < 15; i++) {
    await shop.changeBlindBoxCard(i, 5)
  }

  // swapMarket
  await ncto.grantRole(await ncto.MINT_ROLE(), shop.address)
  await swapMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await swapMarket.addSwapCardList(0, [1, 2, 3, 4])
  await swapMarket.addSwapCardList(1, [0, 2, 3, 4])
  await swapMarket.addSwapCardList(2, [0, 1, 3, 4])
  await swapMarket.addSwapCardList(3, [0, 1, 2, 4])
  await swapMarket.addSwapCardList(4, [0, 1, 2, 3])

  await swapMarket.addSwapCardList(5, [6, 7, 8, 9])
  await swapMarket.addSwapCardList(6, [5, 7, 8, 9])
  await swapMarket.addSwapCardList(7, [5, 6, 8, 9])
  await swapMarket.addSwapCardList(8, [5, 6, 7, 9])
  await swapMarket.addSwapCardList(9, [5, 6, 7, 8])

  await swapMarket.addSwapCardList(10, [11, 12, 13, 14])
  await swapMarket.addSwapCardList(11, [10, 12, 13, 14])
  await swapMarket.addSwapCardList(12, [10, 11, 13, 14])
  await swapMarket.addSwapCardList(13, [10, 11, 12, 14])
  await swapMarket.addSwapCardList(14, [10, 11, 12, 13])

  //  set synthesisMarketV1
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV1.address)
  await synthesisMarketV1.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV1.setSynthesisCardId(15)
  await synthesisMarketV1.addSwapCardList([0, 1, 2, 3, 4])
  //  set synthesisMarketV2
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV2.address)
  await synthesisMarketV2.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV2.setSynthesisCardId(16)
  await synthesisMarketV2.addSwapCardList([5, 6, 7, 8, 9])
  //  set synthesisMarketV3
  await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV3.address)
  await synthesisMarketV3.setUnitPrice(ethers.utils.parseUnits("1", 18))
  await synthesisMarketV3.setSynthesisCardId(17)
  await synthesisMarketV3.addSwapCardList([10, 11, 12, 13, 14])

  // coinWind
  await cto.grantRole(await cto.MINT_ROLE(), coinWindPool.address)
  await coinWindPool.add(
    10, // allocPoint
    WBNB,
    true
  )
  await coinWindPool.add(
    10, // allocPoint
    USDT,
    true
  )

  // coinWind nft
  await cto.grantRole(await cto.MINT_ROLE(), coinWindPoolNFT.address)
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    15, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    15, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    16, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    16, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    WBNB,
    17, //cardId
    true
  )
  await coinWindPoolNFT.add(
    10, // allocPoint
    USDT,
    17, //cardId
    true
  )

  // MasterChef
  await mdxFactory.createPair(cto.address, USDT)
  await mdxFactory.createPair(cto.address, WBNB)
  const cto_usdt = await mdxFactory.getPair(cto.address, USDT)
  const cto_wbnb = await mdxFactory.getPair(cto.address, WBNB)

  await cto.grantRole(await cto.MINT_ROLE(), masterChef.address)
  await masterChef.add(
    10, // allocPoint
    cto_wbnb,
    true
  )
  await masterChef.add(
    10, // allocPoint
    cto_usdt,
    true
  )
  console.log(await getNamedAccounts())
  let info = {
    token: {
      address: cto.address,
      dev: await cto.getRoleMember(await cto.ADMIN_ROLE(), 0),
      // "team TimeLock": {
      //   address: teamTimeLock.address,
      //   beneficiary: await teamTimeLock.beneficiary(),
      //   reward: ethers.utils.formatEther(await cto.balanceOf(teamTimeLock.address)),
      //   rewardPerQuarter: ethers.utils.formatEther(await teamTimeLock.fixedQuantity()),
      //   startTime: (await teamTimeLock.startTime()).toString(),
      // },
      // "foundation TimeLock": {
      //   address: foundationTimeLock.address,
      //   beneficiary: await foundationTimeLock.beneficiary(),
      //   reward: ethers.utils.formatEther(await cto.balanceOf(foundationTimeLock.address)),
      //   rewardPerQuarter: ethers.utils.formatEther(await foundationTimeLock.fixedQuantity()),
      //   startTime: (await foundationTimeLock.startTime()).toString(),
      // },
      // airDrop: {
      //   address: airDrop,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(airDrop)),
      // },
      // consultant: {
      //   address: consultant,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(consultant)),
      // },
      // cooperations: {
      //   address: cooperations,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(cooperations)),
      // },
      // operations: {
      //   address: operations,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(operations)),
      // },
      // IDO: {
      //   address: IDO,
      //   reward: ethers.utils.formatEther(await cto.balanceOf(IDO)),
      // },
    },
    nft: {
      address: ncto.address,
      dev: await ncto.getRoleMember(await ncto.ADMIN_ROLE(), 0),
      "card spec": {
        address: cardSpec.address,
        owner: await cardSpec.owner(),
      },
    },
    shop: {
      lottery: {
        address: shop.address,
        owner: await shop.owner(),
        devaddr: await shop.devaddr(),
      },
      synthesisMarketV1: {
        address: synthesisMarketV1.address,
        owner: await synthesisMarketV1.owner(),
        devaddr: await synthesisMarketV1.devaddr(),
      },
      synthesisMarketV2: {
        address: synthesisMarketV2.address,
        owner: await synthesisMarketV2.owner(),
        devaddr: await synthesisMarketV2.devaddr(),
      },
      synthesisMarketV3: {
        address: synthesisMarketV3.address,
        owner: await synthesisMarketV3.owner(),
        devaddr: await synthesisMarketV3.devaddr(),
      },
      swapMarket: {
        address: swapMarket.address,
        owner: await swapMarket.owner(),
        devaddr: await swapMarket.devaddr(),
      },
    },
    pool: {
      coinWindPool: {
        address: coinWindPool.address,
        owner: await coinWindPool.owner(),
        devaddr: await coinWindPool.devaddr(),
      },
      coinWindPoolNFT: {
        address: coinWindPoolNFT.address,
        owner: await coinWindPoolNFT.owner(),
        devaddr: await coinWindPoolNFT.devaddr(),
      },
      masterChef: {
        address: masterChef.address,
        owner: await masterChef.owner(),
      },
      swapPair: {
        "cto-usdt": cto_usdt,
        "cto-wbnb": cto_wbnb,
      },
    },
  }
  console.log(info)
}
module.exports.dependencies = ["Shop", "SynthesisMarket", "SwapMarket", "TimeLock", "CoinWindPoolWithNFT", "CoinWindPool", "MasterChef"]
