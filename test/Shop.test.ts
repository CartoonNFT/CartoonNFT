import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("Shop", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.Token = await ethers.getContractFactory("CartoonToken")
    this.Shop = await ethers.getContractFactory("Shop")
    this.ERC721Ex = await ethers.getContractFactory("ERC721Ex")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
  })
  beforeEach(async function () {
    // init token
    this.token = await this.Token.deploy(this.alice.address)
    await this.token.deployed()
    // mint token to signers
    await this.token.grantRole(await this.token.MINT_ROLE(), this.alice.address)
    await this.token.mint(this.bob.address, ethers.utils.parseUnits("1000", 18))
    await this.token.mint(this.carol.address, ethers.utils.parseUnits("2000", 18))
    await this.token.mint(this.dave.address, ethers.utils.parseUnits("3000", 18))
    //init card spec
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
    // init nft
    this.nft = await this.ERC721Ex.deploy(this.cardSpec.address, this.alice.address)
    await this.nft.deployed()
    // init shop
    this.shop = await this.Shop.deploy(this.cardSpec.address, this.token.address, this.nft.address, this.eve.address)
    await this.shop.deployed()
    // set shop unit price
    await this.shop.setUnitPrice(ethers.utils.parseUnits("1", 18))
  })
  it("should be set unit price", async function () {
    expect(await this.shop.unitPrice()).equal(ethers.utils.parseUnits("1", 18))
    // require owner
    await this.shop.connect(this.bob).setUnitPrice(ethers.utils.parseUnits("2", 18)).should.be.rejectedWith("Ownable: caller is not the owner")
    // change unit price
    await this.shop.setUnitPrice(ethers.utils.parseUnits("2", 18))
    expect(await this.shop.unitPrice()).equal(ethers.utils.parseUnits("2", 18))
  })
  it("should be change dev", async function () {
    expect(await this.shop.devaddr()).equal(this.eve.address)
    await this.shop.connect(this.bob).dev(this.isaac.address).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.shop.dev(this.isaac.address)
    expect(await this.shop.devaddr()).equal(this.isaac.address)
  })
  it("should check add card id", async function () {
    await this.shop.changeBlindBoxCard(1, 5).should.be.rejectedWith("Shop: CardId out of range")
  })
  context("Go shopping", function () {
    beforeEach(async function () {
      await this.cardSpec.addCardType(1000, 2000, ethers.utils.formatBytes32String("what?"))
      await this.cardSpec.addCardType(1001, 2001, ethers.utils.formatBytes32String("what?"))
      await this.cardSpec.addCardType(1002, 2002, ethers.utils.formatBytes32String("what?"))
      await this.cardSpec.addCardType(1003, 2003, ethers.utils.formatBytes32String("what?"))
      await this.cardSpec.addCardType(1004, 2004, ethers.utils.formatBytes32String("what?"))
      // add card
      await this.nft.grantRole(await this.nft.MINT_ROLE(), this.shop.address)
      await this.shop.changeBlindBoxCard(1, 5)
      await this.shop.changeBlindBoxCard(2, 4)
      await this.shop.changeBlindBoxCard(3, 3)
      await this.shop.changeBlindBoxCard(4, 2)
      await this.shop.changeBlindBoxCard(5, 1)
    })
    it("should be change BlindBox card num", async function () {
      expect(await this.shop.getBlindBoxCardNumLength()).equal(5)
      expect(await this.shop.getBlindBoxCardNum(1)).equal(5)
      expect(await this.shop.getBlindBoxCardAt(0)).eql([ethers.BigNumber.from("1"), ethers.BigNumber.from("5")])

      await this.shop.changeBlindBoxCard(1, 6)
      expect(await this.shop.getBlindBoxCardNumLength()).equal(5)
      expect(await this.shop.getBlindBoxCardNum(1)).equal(6)
      expect(await this.shop.getBlindBoxCardAt(0)).eql([ethers.BigNumber.from("1"), ethers.BigNumber.from("6")])

      await this.shop.changeBlindBoxCard(1, 4)
      expect(await this.shop.getBlindBoxCardNumLength()).equal(5)
      expect(await this.shop.getBlindBoxCardNum(1)).equal(4)
      expect(await this.shop.getBlindBoxCardAt(0)).eql([ethers.BigNumber.from("1"), ethers.BigNumber.from("4")])

      await this.shop.changeBlindBoxCard(1, 0)
      expect(await this.shop.getBlindBoxCardNumLength()).equal(4)
      expect(await this.shop.getBlindBoxCardAt(0)).eql([ethers.BigNumber.from("5"), ethers.BigNumber.from("1")])
    })
    it("should be lottery", async function () {
      await this.shop.connect(this.bob).lottery(this.carol.address).should.be.rejectedWith("TransferHelper: TRANSFER_FROM_FAILED")

      let latestBobBalance = await this.token.balanceOf(this.bob.address)
      let carolNFTBalance = await this.nft.balanceOf(this.carol.address)
      for (let i = 0; i < 15; i++) {
        await this.token.connect(this.bob).approve(this.shop.address, await this.shop.unitPrice())
        await this.shop.connect(this.bob).lottery(this.carol.address)
        expect(await this.token.balanceOf(this.bob.address)).equal(latestBobBalance.sub(await this.shop.unitPrice()))
        latestBobBalance = await this.token.balanceOf(this.bob.address)
        expect(await this.nft.balanceOf(this.carol.address)).equal(carolNFTBalance.add(1))
        carolNFTBalance = await this.nft.balanceOf(this.carol.address)
      }
      await this.shop.connect(this.bob).lottery(this.dave.address).should.be.rejectedWith("Shop: Goods sold out")
      expect(await this.nft.balanceOf(this.carol.address)).equal(15)

      let info = {}
      for (let i = 0; i < 15; i++) {
        let tokenId = await this.nft.tokenOfOwnerByIndex(this.carol.address, i)
        let skin = await this.cardSpec.getTokenSkin(tokenId)
        let rarity = await this.cardSpec.getTokenRarity(tokenId)
        if (!info.hasOwnProperty(skin)) {
          info[skin] = {}
        }
        if (!info[skin].hasOwnProperty(rarity)) {
          info[skin][rarity] = 0
        }
        info[skin][rarity]++
      }

      for (let i = 1; i < 6; i++) {
        let card = await this.cardSpec.cardTypes(i)
        expect(info[card.skin][card.rarity]).equal(6 - i)
      }
    })
    it("should be check pause", async function () {
      await this.shop.connect(this.bob).unpause().should.be.rejectedWith("Ownable: caller is not the owner")
      await this.shop.unpause().should.be.rejectedWith("Pausable: not paused")
      await this.token.connect(this.bob).approve(this.shop.address, await this.shop.unitPrice())
      await this.shop.connect(this.bob).lottery(this.carol.address)
      // pause
      await this.shop.connect(this.bob).pause().should.be.rejectedWith("Ownable: caller is not the owner")
      await this.shop.pause()
      await this.shop.pause().should.be.rejectedWith("Pausable: paused")

      await this.shop.connect(this.bob).lottery(this.carol.address).should.be.rejectedWith("Pausable: paused")
      await this.shop.unpause()
    })
  })
})
