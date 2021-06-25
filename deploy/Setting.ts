module.exports = async ({ ethers, network, getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  let { WBNB, USDT, MDXFactory, MDXRouter } = await getNamedAccounts()
  const { dev } = await ethers.getNamedSigners()
  const { airDrop, consultant, cooperations, operations, IDO, teamRewardAddress, foundationRewardAddress } = await getNamedAccounts()
  const chainId = await getChainId()

  let mdxFactory
  if (chainId == "56" || (chainId == "31337" && network.config.forking)) {
    mdxFactory = await ethers.getContractAt("IMdexFactory", MDXFactory)
  } else {
    mdxFactory = await ethers.getContract("MdexFactoryMock")
    USDT = (await ethers.getContract("tUSDT")).address
    WBNB = (await ethers.getContract("tWBNB9")).address
    MDXRouter = (await ethers.getContract("MdexRouterMock")).address
  }

  const cardSpec = await ethers.getContract("CardSpec")
  const cto = await ethers.getContract("CartoonToken")

  const ncto = await ethers.getContract("NCTO")
  const shop = await ethers.getContract("Shop")
  const swapMarket = await ethers.getContract("SwapMarket")
  const synthesisMarketV1 = await ethers.getContract("SynthesisMarketV1")
  const synthesisMarketV2 = await ethers.getContract("SynthesisMarketV2")
  const synthesisMarketV3 = await ethers.getContract("SynthesisMarketV3")
  const masterChefNFT = await ethers.getContract("MasterChefNFT")
  const masterChef = await ethers.getContract("MasterChef")
  const exchangeNFT = await ethers.getContract("ExchangeNFT")

  console.log("starting add card...")
  let skin = [
    1000,
    1001,
    1002,
    1003,
    1004,
    1005,
    1006,
    1007,
    1008,
    1009,
    1010,
    1011,
    1012,
    1013,
    1014,
    1015,
    1016,
    1017,
    1018,
    1019,
    2000,
    2001,
    2002,
  ]
  let rarity = [
    1001,
    1002,
    1000,
    1000,
    1000,
    1002,
    1001,
    1002,
    1001,
    1000,
    1002,
    1001,
    1001,
    1000,
    1000,
    1002,
    1001,
    1000,
    1000,
    1000,
    1000,
    1001,
    1002,
  ]
  let comment = [
    "Jun Uozumi",
    "Akira Sendoh",
    "Kicchou Fukuda",
    "Hiroaki Koshino",
    "Tomoyuki Uekusa",
    "Hanamichi Sakuragi",
    "Takenori Akagi",
    "Kaede Rukawa",
    "Hisashi Mitsui",
    "Ryota Miyagi",
    "Shinichi Maki",
    "Soichiro Jin",
    "Nobunaga Kiyota",
    "Yoshinori Miyawasu",
    "Kazuma Takasago",
    "Kenji Fujima",
    "Toru Hanagata",
    "Kazushi Hasegawa",
    "Mitsuru Nagano",
    "Shoichi Takano",
    "MiningCardv1",
    "MiningCardv2",
    "MiningCardv3",
  ]
  for (let i = 0; i < 23; i++) {
    if (i + 1 == (await cardSpec.getCardTypesLength())) {
      console.log("add cardId:", i + 1)
      await (await cardSpec.addCardType(skin[i], rarity[i], ethers.utils.formatBytes32String(comment[i]))).wait()
    }
  }

  // mint card to shop

  if ((await cto.hasRole(await cto.MINT_ROLE(), masterChef.address)) == false) {
    console.log("cto grant masterChef mint Role...")
    await (await cto.grantRole(await cto.MINT_ROLE(), masterChef.address)).wait()
  }
  if ((await cto.hasRole(await cto.MINT_ROLE(), masterChefNFT.address)) == false) {
    console.log("cto grant masterChefNFT mint Role...")
    await (await cto.grantRole(await cto.MINT_ROLE(), masterChefNFT.address)).wait()
  }

  if ((await ncto.hasRole(await ncto.MINT_ROLE(), shop.address)) == false) {
    console.log("ncto shop grant mint Role...")
    await (await ncto.grantRole(await ncto.MINT_ROLE(), shop.address)).wait()
  }
  if ((await ncto.hasRole(await ncto.MINT_ROLE(), swapMarket.address)) == false) {
    console.log("ncto shop grant swapMarket Role...")
    await (await ncto.grantRole(await ncto.MINT_ROLE(), swapMarket.address)).wait()
  }
  if ((await ncto.hasRole(await ncto.MINT_ROLE(), synthesisMarketV1.address)) == false) {
    console.log("ncto shop grant synthesisMarketV1 Role...")
    await (await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV1.address)).wait()
  }
  if ((await ncto.hasRole(await ncto.MINT_ROLE(), synthesisMarketV2.address)) == false) {
    console.log("ncto shop grant synthesisMarketV2 Role...")
    await (await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV2.address)).wait()
  }
  if ((await ncto.hasRole(await ncto.MINT_ROLE(), synthesisMarketV3.address)) == false) {
    console.log("ncto shop grant synthesisMarketV3 Role...")
    await (await ncto.grantRole(await ncto.MINT_ROLE(), synthesisMarketV3.address)).wait()
  }

  if ((await ncto.baseURI()) == "") {
    if ((await ncto.hasRole(await ncto.UPDATE_TOKEN_URI_ROLE(), shop.address)) == false) {
      console.log("ncto set baseURI...")
      await (await ncto.grantRole(await ncto.UPDATE_TOKEN_URI_ROLE(), deployer)).wait()
      await (await ncto.setBaseURI("https://cartoonnft.io/identity/")).wait()
      await (await ncto.revokeRole(await ncto.UPDATE_TOKEN_URI_ROLE(), deployer)).wait()
    }
  }
  if ((await shop.unitPrice()) == 0) {
    console.log("shop setUnitPrice..")
    await (await shop.setUnitPrice(ethers.utils.parseUnits("1", 18))).wait()
  }

  for (let i = 0; i < 21; i++) {
    if ((await shop.getBlindBoxCardNumLength()) == i) {
      console.log("add blind box cardId:", i + 1)
      await (await shop.changeBlindBoxCard(i + 1, 100)).wait()
    }
  }

  // swapMarket

  if ((await swapMarket.unitPrice()) == 0) {
    console.log("swapMarket setUnitPrice..")
    await (await swapMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))).wait()
  }

  let cardId = [3, 4, 5, 10, 14, 15, 18, 19, 20, 1, 7, 9, 12, 13, 17, 2, 6, 8, 11, 16]
  let swapList = [
    [4, 5, 10, 14, 15, 18, 19, 20],
    [3, 5, 10, 14, 15, 18, 19, 20],
    [3, 4, 10, 14, 15, 18, 19, 20],
    [3, 4, 5, 14, 15, 18, 19, 20],
    [3, 4, 5, 10, 15, 18, 19, 20],
    [3, 4, 5, 10, 14, 18, 19, 20],
    [3, 4, 5, 10, 14, 15, 19, 20],
    [3, 4, 5, 10, 14, 15, 18, 20],
    [3, 4, 5, 10, 14, 15, 18, 19],
    [7, 9, 12, 13, 17],
    [1, 9, 12, 13, 17],
    [1, 7, 12, 13, 17],
    [1, 7, 9, 13, 17],
    [1, 7, 9, 12, 17],
    [1, 7, 9, 12, 13],
    [6, 8, 11, 16],
    [2, 8, 11, 16],
    [2, 6, 11, 16],
    [2, 6, 8, 16],
    [2, 6, 8, 11],
  ]

  for (let i = 0; i < 20; i++) {
    let identity = await cardSpec.getIdentityFromCardId(cardId[i])
    if (await swapMarket.getSwapCardLength(identity) == 0) {
      console.log("add swap market", i + 1)
      await (await swapMarket.addSwapCardList(identity, swapList[i])).wait()
    }
  }

  //  set synthesisMarketV1
  if ((await synthesisMarketV1.unitPrice()) == 0) {
    console.log("synthesisMarketV1 setUnitPrice..")
    await (await synthesisMarketV1.setUnitPrice(ethers.utils.parseUnits("1", 18))).wait()
  }
  console.log("adding synthesisMarketV1 list...")
  if ((await synthesisMarketV1.getSwapCardListLength()) == 0) {
    await (await synthesisMarketV1.addSwapCardList([3, 4, 5, 10, 14, 15, 18, 19, 20])).wait()
  }
  if ((await synthesisMarketV1.synthesisCardId()) == 0) {
    await (await synthesisMarketV1.setSynthesisCardId(21)).wait()
  }
  if ((await synthesisMarketV1.swapLength()) == 0) {
    await (await synthesisMarketV1.setAllowedLength(5)).wait()
  }

  //  set synthesisMarketV2
  if ((await synthesisMarketV2.unitPrice()) == 0) {
    console.log("synthesisMarketV2 setUnitPrice..")
    await (await synthesisMarketV2.setUnitPrice(ethers.utils.parseUnits("1", 18))).wait()
  }
  console.log("adding synthesisMarketV2 list...")
  if ((await synthesisMarketV2.getSwapCardListLength()) == 0) {
    await (await synthesisMarketV2.addSwapCardList([1, 7, 9, 12, 13, 17])).wait()
  }
  if ((await synthesisMarketV2.synthesisCardId()) == 0) {
    await (await synthesisMarketV2.setSynthesisCardId(22)).wait()
  }
  if ((await synthesisMarketV2.swapLength()) == 0) {
    await (await synthesisMarketV2.setAllowedLength(5)).wait()
  }

  //  set synthesisMarketV3
  if ((await synthesisMarketV3.unitPrice()) == 0) {
    console.log("synthesisMarketV3 setUnitPrice..")
    await (await synthesisMarketV3.setUnitPrice(ethers.utils.parseUnits("1", 18))).wait()
  }
  console.log("adding synthesisMarketV3 list...")
  if ((await synthesisMarketV3.getSwapCardListLength()) == 0) {
    await (await synthesisMarketV3.addSwapCardList([2, 6, 8, 11, 16])).wait()
  }
  if ((await synthesisMarketV3.synthesisCardId()) == 0) {
    await (await synthesisMarketV3.setSynthesisCardId(23)).wait()
  }
  if ((await synthesisMarketV3.swapLength()) == 0) {
    await (await synthesisMarketV3.setAllowedLength(5)).wait()
  }

  // masterChefNFT
  console.log("adding masterChefNFT pool...")
  if ((await masterChefNFT.poolLength()) == 0) {
    console.log("adding masterChefNFT pool 0")
    await (
      await masterChefNFT.add(
        10, // allocPoint
        21, //cardId
        true
      )
    ).wait()
  }

  if ((await masterChefNFT.poolLength()) == 1) {
    console.log("adding masterChefNFT pool 1")
    await (
      await masterChefNFT.add(
        20, // allocPoint
        22, //cardId
        true
      )
    ).wait()
  }
  if ((await masterChefNFT.poolLength()) == 2) {
    console.log("adding masterChefNFT pool 2")
    await (
      await masterChefNFT.add(
        30, // allocPoint
        23, //cardId
        true
      )
    ).wait()
  }

  if ((await mdxFactory.getPair(cto.address, USDT)) == "0x0000000000000000000000000000000000000000") {
    console.log("create pair cto_usdt")
    await (await mdxFactory.createPair(cto.address, USDT)).wait()
  }

  if ((await mdxFactory.getPair(cto.address, WBNB)) == "0x0000000000000000000000000000000000000000") {
    console.log("create pair cto_wbnb")
    await (await mdxFactory.createPair(cto.address, WBNB)).wait()
  }
  const cto_usdt = await mdxFactory.getPair(cto.address, USDT)
  const cto_wbnb = await mdxFactory.getPair(cto.address, WBNB)

  // MasterChef
  console.log("adding masterChef pool...")
  if ((await masterChef.poolLength()) == 0) {
    console.log("adding masterChef pool 0")
    await (
      await masterChef.add(
        10, // allocPoint
        cto_wbnb,
        true
      )
    ).wait()
  }
  if ((await masterChef.poolLength()) == 1) {
    console.log("adding masterChef pool 1")
    await (
      await masterChef.add(
        10, // allocPoint
        cto_usdt,
        true
      )
    ).wait()
  }

  // set exchangeNFT feeToRate
  if ((await exchangeNFT.feeToRate()) == 0) {
    console.log("setting exchangeNFT feeToRate...")
    await (await exchangeNFT.setFeeToRate(ethers.utils.parseUnits("1", 10))).wait()
  }

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
        price: (await shop.unitPrice()).toString(),
      },
      synthesisMarketV1: {
        address: synthesisMarketV1.address,
        owner: await synthesisMarketV1.owner(),
        devaddr: await synthesisMarketV1.devaddr(),
        price: (await synthesisMarketV1.unitPrice()).toString(),
      },
      synthesisMarketV2: {
        address: synthesisMarketV2.address,
        owner: await synthesisMarketV2.owner(),
        devaddr: await synthesisMarketV2.devaddr(),
        price: (await synthesisMarketV2.unitPrice()).toString(),
      },
      synthesisMarketV3: {
        address: synthesisMarketV3.address,
        owner: await synthesisMarketV3.owner(),
        devaddr: await synthesisMarketV3.devaddr(),
        price: (await synthesisMarketV3.unitPrice()).toString(),
      },
      swapMarket: {
        address: swapMarket.address,
        owner: await swapMarket.owner(),
        devaddr: await swapMarket.devaddr(),
        price: (await swapMarket.unitPrice()).toString(),
      },
    },
    exchangeNFT: {
      address: exchangeNFT.address,
      owner: await exchangeNFT.owner(),
      devaddr: await exchangeNFT.devaddr(),
      feeToRate: (await exchangeNFT.feeToRate()).toString(),
    },
    pool: {
      masterChef: {
        address: masterChef.address,
        owner: await masterChef.owner(),
      },
      masterChefNFT: {
        address: masterChefNFT.address,
        owner: await masterChefNFT.owner(),
      },
      swapPair: {
        factory: mdxFactory.address,
        router: MDXRouter,
        usdt: USDT,
        WBNB: WBNB,
        "cto-usdt": cto_usdt,
        "cto-wbnb": cto_wbnb,
      },
    },
  }
  console.log(info)
}
module.exports.dependencies = ["Shop", "SynthesisMarket", "SwapMarket", "TimeLock", "MasterChefNFT", "MasterChef", "ExchangeNFT", "MdxSwapMock"]
