import { deployments, ethers, getNamedAccounts } from "hardhat"
import * as chai from "chai"
import * as chaiAsPromised from "chai-as-promised"

chai.should()
chai.use(chaiAsPromised)

const { expect } = chai
describe("Card Spec", function () {
  before(async function () {
    this.CardSpec = await ethers.getContractFactory("CardSpec")
    this.signers = await ethers.getSigners()
    ;[this.alice, this.bob, this.carol, this.dave, this.eve, this.isaac] = await ethers.getSigners()
  })

  beforeEach(async function () {
    this.cardSpec = await this.CardSpec.deploy()
    await this.cardSpec.deployed()
  })
  it("should be check owner", async function () {
    expect(await this.cardSpec.owner()).equal(this.alice.address)
  })
  it("should be add card", async function () {
    const skin = 2
    const rarity = 3
    const comment = ethers.utils.formatBytes32String("what?")
    await this.cardSpec.connect(this.bob).addCardType(skin, rarity, comment).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.cardSpec.addCardType(skin, rarity, comment)
    expect(await this.cardSpec.getCardTypesLength()).equal(2)
    const card = await this.cardSpec.cardTypes(1)
    expect(card["skin"]).equal(skin)
    expect(card["rarity"]).equal(rarity)
    expect(card["comment"]).equal(comment)
  })
  it("should be add skill", async function () {
    const skill = 3333
    await this.cardSpec.connect(this.bob).addSkillType(skill).should.be.rejectedWith("Ownable: caller is not the owner")
    await this.cardSpec.addSkillType(skill)

    expect(await this.cardSpec.getSkillLength()).equal(1)
    expect(await this.cardSpec.containSkill(skill)).to.be.true
    await this.cardSpec.addSkillType(skill)

    expect(await this.cardSpec.getSkillLength()).equal(1)
    expect(await this.cardSpec.containSkill(skill)).to.be.true

    const skill2 = 3334
    await this.cardSpec.addSkillType(skill2)
    expect(await this.cardSpec.getSkillLength()).equal(2)
    expect(await this.cardSpec.containSkill(skill2)).to.be.true
  })
  it("should be check property", async function () {
    const tokenId = "0x8000045708ae00000000000000000000000d0500606ed1730000000000000001"
    const skin = 1111
    const rarity = 2222
    const skill = 3333
    const identity = ethers.BigNumber.from(tokenId).shr(await this.cardSpec.CARD_IDENTITY_BIT())
    const mintTime = ethers.BigNumber.from(tokenId)
      .and(await this.cardSpec.CARD_PERSONALITY_MINTTIME_MASK())
      .shr(await this.cardSpec.CARD_PERSONALITY_MINTTIME_BIT())
    expect(await this.cardSpec.getTokenSkin(tokenId)).equal(skin)
    expect(await this.cardSpec.getTokenRarity(tokenId)).equal(rarity)
    expect(await this.cardSpec.getTokenSkill(tokenId)).equal(skill)
    expect(await this.cardSpec.getTokenIdentity(tokenId)).equal(identity)
    expect(await this.cardSpec.getTokenMintTime(tokenId)).equal(mintTime)
    expect(await this.cardSpec.getTokenIndex(tokenId)).equal(1)
    expect(await this.cardSpec.getTokenPersonality(tokenId)).equal("0x00000d0500606ed1730000000000000001")
  })
})
