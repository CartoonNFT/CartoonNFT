import sys
NFT_SIGN = 0x8000
NFT_SIGN_BIT = 240
CARD_SKIN_BIT = 224
CARD_RARITY_BIT = 208
CARD_IDENTITY_BIT = 168
if __name__ == '__main__':

    if len(sys.argv) != 3:
        sys.exit('arguments error')
    skin = int(sys.argv[1])
    rarity = int(sys.argv[2])
    identity = ((NFT_SIGN << NFT_SIGN_BIT) | (skin << CARD_SKIN_BIT) | (rarity << CARD_RARITY_BIT)) >> CARD_IDENTITY_BIT
    print('identity', identity)
    print('identity hex', hex(identity))
