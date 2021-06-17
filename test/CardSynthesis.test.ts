import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"
import { eventNames } from "process"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("Card Synthesis Market", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.SynthesisMarket = await ethers.getContractFactory("SynthesisMarket")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    // init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(3, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(4, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(5, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(100, 1, ethers.utils.formatBytes32String("what?"))
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    // init nft

    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    // init card synthesis
    this.synthesisMarket = await this.SynthesisMarket.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.dave.address)
    await this.synthesisMarket.deployed()

    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))
  })
  it("should be set unit price", async function () {
    expect(await this.synthesisMarket.unitPrice()).equal(ethers.utils.parseUnits("1", 18))
    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("2", 18))
    expect(await this.synthesisMarket.unitPrice()).equal(ethers.utils.parseUnits("2", 18))
  })
  it("should be set synthesis card", async function () {
    await this.synthesisMarket.connect(this.bob).setSynthesisCardId(111).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.setSynthesisCardId(111).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.setSynthesisCardId(5)
    expect(await this.synthesisMarket.synthesisCardId()).equal(5)
  })

  it("should be add swap card list", async function () {
    // role check
    await this.synthesisMarket.connect(this.bob).addSwapCardList([1, 2, 3, 4, 5]).should.be.rejectedWith("Ownable: caller is not the owner")
    // card range check
    await this.synthesisMarket.addSwapCardList([1, 2, 3, 4, 7]).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.addSwapCardList([1, 2, 3, 4, 5])

    expect(await this.synthesisMarket.getSwapCardListLength()).equal(5)
    expect(await this.synthesisMarket.containSwapCardList(1)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(2)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(3)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(4)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(5)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(110)).to.be.false

    expect(await this.synthesisMarket.getSwapCardList()).eql([
      ethers.BigNumber.from(1),
      ethers.BigNumber.from(2),
      ethers.BigNumber.from(3),
      ethers.BigNumber.from(4),
      ethers.BigNumber.from(5),
    ])
  })
  it("should be check pause", async function () {
    await this.synthesisMarket.pause()
    await this.synthesisMarket.synthesis([1]).should.be.rejectedWith("Pausable: paused")
    await this.synthesisMarket.unpause()
    await this.synthesisMarket.synthesis([1]).should.be.rejectedWith("length mismatch")
  })
  it("should be change dev", async function () {
    expect(await this.synthesisMarket.devaddr()).equal(this.dave.address)
    await this.synthesisMarket.connect(this.bob).dev(this.isaac.address).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.dev(this.isaac.address)
    expect(await this.synthesisMarket.devaddr()).equal(this.isaac.address)
  })
})

describe("Card Synthesis", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.SynthesisMarket = await ethers.getContractFactory("SynthesisMarket")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()

    // init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    await this.cardSpec.addCardType(1, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(2, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(3, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(4, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(5, 1, ethers.utils.formatBytes32String("what?"))
    await this.cardSpec.addCardType(100, 1, ethers.utils.formatBytes32String("what?"))
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    // init nft

    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()

    // init card synthesis
    this.synthesisMarket = await this.SynthesisMarket.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.dave.address)
    await this.synthesisMarket.deployed()

    await this.synthesisMarket.setUnitPrice(ethers.utils.parseUnits("1", 18))

    await this.synthesisMarket.addSwapCardList([1, 2, 3, 4, 5])
    await this.synthesisMarket.setSynthesisCardId(6)
    await this.synthesisMarket.setAllowedLength(5)

    //mint nft to carol

    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.alice.address)
    for (let i = 1; i < 6; i++) {
      let card = await this.cardSpec.cardTypes(i)
      let tokenPreId = ethers.BigNumber.from(await this.cardSpec.NFT_SIGN())
        .shl(await this.cardSpec.NFT_SIGN_BIT())
        .or(ethers.BigNumber.from(card["skin"]).shl(await this.cardSpec.CARD_SKIN_BIT()))
        .or(ethers.BigNumber.from(card["rarity"]).shl(await this.cardSpec.CARD_RARITY_BIT()))
      await this.nft.mint(this.carol.address, tokenPreId)
    }
    for (let i = 1; i < 6; i++) {
      let card = await this.cardSpec.cardTypes(i)
      let tokenPreId = ethers.BigNumber.from(await this.cardSpec.NFT_SIGN())
        .shl(await this.cardSpec.NFT_SIGN_BIT())
        .or(ethers.BigNumber.from(card["skin"]).shl(await this.cardSpec.CARD_SKIN_BIT()))
        .or(ethers.BigNumber.from(card["rarity"]).shl(await this.cardSpec.CARD_RARITY_BIT()))
      await this.nft.mint(this.carol.address, tokenPreId)
    }
    expect(await this.nft.totalSupply()).equal(10)
    expect(await this.nft.balanceOf(this.carol.address)).equal(10)
  })

  it("should be remove swap card", async function () {
    await this.synthesisMarket.connect(this.bob).removeSwapCardList([1, 2]).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.synthesisMarket.removeSwapCardList([1, 111]).should.be.rejectedWith("card id out of range")
    await this.synthesisMarket.removeSwapCardList([1, 2])

    expect(await this.synthesisMarket.getSwapCardListLength()).equal(3)
    expect(await this.synthesisMarket.containSwapCardList(1)).to.be.false
    expect(await this.synthesisMarket.containSwapCardList(2)).to.be.false
    expect(await this.synthesisMarket.containSwapCardList(3)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(4)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(5)).to.be.true
    expect(await this.synthesisMarket.containSwapCardList(110)).to.be.false
  })
  it("should be synthesis", async function () {
    let tokenIds = []
    for (let i = 0; i < 5; i++) {
      tokenIds.push(await this.nft.tokenOfOwnerByIndex(this.carol.address, i))
    }
    await this.token.connect(this.bob).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket
      .connect(this.bob)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[3]])
      .should.be.rejectedWith("length mismatch")
    // no approve
    await this.synthesisMarket.connect(this.eve).synthesis(tokenIds).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

    // no enough balance
    await this.token.connect(this.eve).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket.connect(this.eve).synthesis(tokenIds).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

    // tokenId not owner
    await this.synthesisMarket
      .connect(this.bob)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[4], tokenIds[4]])
      .should.be.rejectedWith("Must have mint role")

    await this.nft.grantRole(await this.nft.MINT_ROLE(), this.synthesisMarket.address)

    await this.synthesisMarket
      .connect(this.bob)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[4], tokenIds[4]])
      .should.be.rejectedWith("ERC721: transfer caller is not owner nor approved")

    // identity has been exist
    await this.token.connect(this.carol).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.nft.connect(this.carol).approveBulk(this.synthesisMarket.address, tokenIds)

    await this.synthesisMarket
      .connect(this.carol)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[4], tokenIds[4]])
      .should.be.rejectedWith("identity has been exist")
    await this.synthesisMarket
      .connect(this.carol)
      .synthesis([tokenIds[0], tokenIds[1], tokenIds[2], tokenIds[3], 10])
      .should.be.rejectedWith("identity not in list")

    let tx = await (await this.synthesisMarket.connect(this.carol).synthesis(tokenIds)).wait()

    let iface = new ethers.utils.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"])
    let event = iface.parseLog(
      tx.logs?.filter((x) => {
        return x.address == this.nft.address && x.topics[0] == iface.getEventTopic("Transfer") && x.topics[1] == ethers.constants.HashZero
      })[0]
    )
    let synthesisedTokenId = event.args.tokenId
    //get info
    let lockTokenIds = await this.synthesisMarket.getAssetsIndex(synthesisedTokenId)
    expect(lockTokenIds).eql(tokenIds)
    expect(await this.cardSpec.getTokenSkin(synthesisedTokenId)).equal(100)
    expect(await this.cardSpec.getTokenRarity(synthesisedTokenId)).equal(1)

    expect(await this.nft.ownerOf(synthesisedTokenId)).equal(this.carol.address)
    expect(await this.nft.balanceOf(this.carol.address)).equal(6)

    // decomposition

    // not owner
    await this.synthesisMarket.decomposition(synthesisedTokenId).should.be.rejectedWith("not tokens owner")

    await this.synthesisMarket.connect(this.carol).decomposition(synthesisedTokenId).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")
    await this.token.connect(this.carol).approve(this.synthesisMarket.address, await this.synthesisMarket.unitPrice())
    await this.synthesisMarket.connect(this.carol).decomposition(synthesisedTokenId).should.be.rejectedWith("caller is not owner nor approved")
    await this.nft.connect(this.carol).approve(this.synthesisMarket.address, synthesisedTokenId)

    await this.synthesisMarket.connect(this.carol).decomposition(synthesisedTokenId)

    // // repetitive decomposition
    await this.synthesisMarket.connect(this.carol).decomposition(synthesisedTokenId).should.be.rejectedWith("asset not found")

    await this.nft.ownerOf(synthesisedTokenId).should.be.rejectedWith("ERC721: owner query for nonexistent token")
    expect(await this.nft.balanceOf(this.carol.address)).equal(10)
  })
})
