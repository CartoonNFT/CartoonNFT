// SPDX-License-Identifier: MIT

pragma solidity >=0.7.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';

contract CardSpec is Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    //             identity           |           personality
    // nftSign  skin  rarity  padding |   padding  skill   mintTime  index
    // 16        16     16      40    |     32       32       40       64
    // 240       224    208     168   |     136      104      64       0

    // nft sign id
    uint16 public constant NFT_SIGN = 0x8000;

    uint8 public constant NFT_SIGN_BIT = 240;
    uint8 public constant CARD_SKIN_BIT = 224;
    uint8 public constant CARD_RARITY_BIT = 208;
    uint8 public constant CARD_IDENTITY_BIT = 168;
    uint8 public constant CARD_IDENTITY_PADDING_BIT = 168;
    uint8 public constant CARD_PERSONALITY_PADDING_BIT = 136;
    uint8 public constant CARD_PERSONALITY_SKILL_BIT = 104;
    uint8 public constant CARD_PERSONALITY_MINTTIME_BIT = 64;
    uint8 public constant CARD_PERSONALITY_INDEX_BIT = 0;

    uint256 public constant CARD_IDENTITY_MASK = uint256(~uint88(0)) << CARD_IDENTITY_BIT;
    uint256 public constant CARD_SKIN_MASK = uint256(~uint16(0)) << CARD_SKIN_BIT;
    uint256 public constant CARD_RARITY_MASK = uint256(~uint16(0)) << CARD_RARITY_BIT;
    uint256 public constant CARD_PERSONALITY_SKILL_MASK = uint256(~uint32(0)) << CARD_PERSONALITY_SKILL_BIT;

    uint256 public constant CARD_PERSONALITY_MINTTIME_MASK = uint256(~uint40(0)) << CARD_PERSONALITY_MINTTIME_BIT;
    uint256 public constant CARD_PERSONALITY_INDEX_MASK = uint256(~uint64(0)) << CARD_PERSONALITY_INDEX_BIT;

    struct CardType {
        uint16 skin;
        uint16 rarity;
        bytes32 comment;
    }

    // card type array
    CardType[] public cardTypes;
    EnumerableSet.UintSet private skillTypes;

    constructor() {
        cardTypes.push();
    }

    function addCardType(
        uint16 _skin,
        uint16 _rarity,
        bytes32 _comment
    ) external onlyOwner returns (uint256 cardId) {
        cardId = cardTypes.length;
        CardType storage cardType = cardTypes.push();
        cardType.skin = _skin;
        cardType.rarity = _rarity;
        cardType.comment = _comment;
    }

    function addSkillType(uint32 _skill) external onlyOwner returns (bool) {
        return skillTypes.add(_skill);
    }

    function getCardTypesLength() external view returns (uint256) {
        return cardTypes.length;
    }

    function getTokenSkin(uint256 tokenId) public pure returns (uint16) {
        return uint16(tokenId >> CARD_SKIN_BIT);
    }

    function getTokenRarity(uint256 tokenId) public pure returns (uint16) {
        return uint16(tokenId >> CARD_RARITY_BIT);
    }

    // identity for token id uri
    function getTokenIdentity(uint256 tokenId) public pure returns (uint256) {
        return tokenId >> CARD_IDENTITY_BIT;
    }

    function getTokenSkill(uint256 tokenId) public pure returns (uint32) {
        return uint32(tokenId >> CARD_PERSONALITY_SKILL_BIT);
    }

    function getTokenMintTime(uint256 tokenId) public pure returns (uint64) {
        return uint64(uint40(tokenId >> CARD_PERSONALITY_MINTTIME_BIT));
    }

    function getTokenIndex(uint256 tokenId) public pure returns (uint64) {
        return uint64(tokenId);
    }

    function getTokenPersonality(uint256 tokenId) public pure returns (uint256) {
        return uint256(uint136(tokenId));
    }

    function getSkillLength() public view returns (uint256) {
        return skillTypes.length();
    }

    function containSkill(uint32 _skill) public view returns (bool) {
        return skillTypes.contains(_skill);
    }

    function getIdentityFromCardId(uint256 _cardId) public view returns (uint256) {
        CardType storage card = cardTypes[_cardId];
        return
            ((uint256(NFT_SIGN) << NFT_SIGN_BIT) | (uint256(card.skin) << CARD_SKIN_BIT) | (uint256(card.rarity) << CARD_RARITY_BIT)) >>
            CARD_IDENTITY_BIT;
    }
}
