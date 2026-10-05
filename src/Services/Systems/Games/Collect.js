const Discord = require("discord.js")

class Collect {
    async messageCollect(message, userId, yourcard, dealercard, DECK, options, filter) {
        return new Promise((resolve) => {
            let isSoft = false
            if (yourcard.map(c => c.rank).includes("A") && yourcard.find(c => c.rank === "A" && c.value === 11)) isSoft = true
            let yourvalue = yourcard.map(c => c.value).reduce((a, b) => b + a)
            let dealervalue = dealercard.map(c => c.value).reduce((a, b) => b + a)
            const collector = message.channel.createMessageCollector({ filter: (m) => m.author.id === userId && filter.includes(m.content.toLowerCase()), time: 30000 });

            collector.on('collect', async m => {
                let input = m.content.toLowerCase()
                collector.stop()
                if (input === "h" || input === "hit") {
                    resolve(await this.hit(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "s" || input === "stand") {
                    resolve(await this.stand(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "d" || input === "doubledown") {
                    resolve(await this.doubledown(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "split") {
                    resolve(await this.split(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "cancel") {
                    resolve(await this.cancel(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "i" || input === "insurance") {
                    resolve(await this.insurance(message, userId, yourcard, dealercard, DECK, options))
                } else if (input === "ni" || input === "noinsurance") {
                    resolve(await this.noinsurance(message, userId, yourcard, dealercard, DECK, options))
                }
            })

            collector.on('end', (collected, reason) => {
                if (reason === "time") {
                    resolve({ result: "TIMEOUT", method: "None", ycard: yourcard, dcard: dealercard })
                }
            })
        })
    }

    async buttonCollect(message, userId, yourcard, dealercard, DECK, options) {
        return new Promise((resolve) => {
            let isSoft = false
            if (yourcard.map(c => c.rank).includes("A") && yourcard.find(c => c.rank === "A" && c.value === 11)) isSoft = true
            let yourvalue = yourcard.map(c => c.value).reduce((a, b) => b + a)
            let dealervalue = dealercard.map(c => c.value).reduce((a, b) => b + a)
            const collector = message.createMessageComponentCollector({ filter: (i) => i.user.id === userId, time: 30000 });

            collector.on('collect', async i => {
                await i.deferUpdate()
                collector.stop()
                if (i.customId === "discord-blackjack-hitbtn") {
                    resolve(await this.hit(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-standbtn") {
                    resolve(await this.stand(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-ddownbtn") {
                    resolve(await this.doubledown(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-cancelbtn") {
                    resolve(await this.cancel(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-splitbtn") {
                    resolve(await this.split(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-insbtn") {
                    resolve(await this.insurance(message, userId, yourcard, dealercard, DECK, options))
                } else if (i.customId === "discord-blackjack-noinsbtn") {
                    resolve(await this.noinsurance(message, userId, yourcard, dealercard, DECK, options))
                }
            })

            collector.on('end', (collected, reason) => {
                if (reason === "time") {
                    resolve({ result: "TIMEOUT", method: "None", ycard: yourcard, dcard: dealercard })
                }
            })
        })
    }

    async hit(message, userId, yourcard, dealercard, DECK, options) {
        let isSoft = false
        let newCard = DECK.pop()
        if (newCard.rank === "A") {
            if (yourcard.map(c => c.rank).includes("A")) {
                newCard.value = 1
            } else {
                newCard.value = 11
            }
        }
        yourcard.push(newCard)
        if (yourcard.map(c => c.rank).includes("A") && yourcard.find(c => c.rank === "A" && c.value === 11)) isSoft = true
        let yourvalue = yourcard.map(c => c.value).reduce((a, b) => b + a)
        if (yourvalue > 21 && isSoft == true) {
            isSoft = false
            for (let y = 0; y < yourcard.length; y++) {
                if (yourcard[y].rank === "A" && yourcard[y].value === 11) {
                    yourcard[y].value = 1
                }
            }
            yourvalue = yourcard.map(c => c.value).reduce((a, b) => b + a)
        }
        if (yourvalue >= 21) {
            return this.stand(message, userId, yourcard, dealercard, DECK, options)
        } else {
            let embed = options.embed
            embed.fields[0].value = `Kartlar: ${yourcard.map(c => `[\`${c.emoji} ${c.rank}\`](https:

            let hitbtn = { label: "Kart", style: 2, custom_id: "discord-blackjack-hitbtn", type: 2 }
            let standbtn = { label: "Dur", style: 2, custom_id: "discord-blackjack-standbtn", type: 2 }
            let cancelbtn = { label: "Çekil", style: 4, custom_id: "discord-blackjack-cancelbtn", type: 2 }
            let row1 = { type: 1, components: [hitbtn, standbtn] }
            let row2 = { type: 1, components: [cancelbtn] }
            let components = [row1]
            if (options.transition === "edit") {
                if (options.commandType === "message") {
                    message = await message.edit({ embeds: [embed], components })
                } else {
                    message = await message.edit({ embeds: [embed], components })
                }
            } else {
                if (options.commandType === "message") {
                    await message.delete()
                    message = await message.channel.send({ embeds: [embed], components })
                } else {
                    if (!message.ephemeral) {
                        await message.delete()
                    }
                    message = await message.channel.send({ embeds: [embed], components })
                }
            }
            return options.buttons ? this.buttonCollect(message, userId, yourcard, dealercard, DECK, options) : this.messageCollect(message, userId, yourcard, dealercard, DECK, options)
        }
    }

    async stand(message, userId, yourcard, dealercard, DECK, options) {
        let isSoft = false
        if (yourcard.map(c => c.rank).includes("A") && yourcard.find(c => c.rank === "A" && c.value === 11)) isSoft = true
        let yourvalue = yourcard.map(c => c.value).reduce((a, b) => b + a)
        let dealervalue = dealercard.map(c => c.value).reduce((a, b) => b + a)
        let finalResult = {}
        let finalResult2 = {}
        if (options.isSplit === "first") {
            let yourcard2 = options.secondHand
            options.isSplit = "second"
            options.firstHand = yourcard
            return this.hit(message, userId, yourcard2, dealercard, DECK, options)
        }

        if (options.isSplit === "done") {
            let yourcard2 = yourcard
            let yourcard1 = options.firstHand
            let yourvalue2 = yourcard2.map(c => c.value).reduce((a, b) => b + a)
            let yourvalue1 = yourcard1.map(c => c.value).reduce((a, b) => b + a)
            let bj1 = false
            let bj2 = false
            let dbj1 = false
            let dbj2 = false
            if (yourvalue1 === 21 && yourcard1.length === 2) bj1 = true
            if (yourvalue2 === 21 && yourcard2.length === 2) bj2 = true

            if ((dealervalue === 21 && dealercard.length === 2)) {
                if (bj1 == true && bj2 == true) {
                    finalResult = { result: `SPLIT TIE-TIE`, method: `Her iki elde Berabere! (Bot ve siz Blackjack yaptınız!)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                } else if (bj1 == true && bj2 == false) {
                    finalResult = { result: `SPLIT TIE-LOSE`, method: `İlk el Berabere! (Bot ve siz Blackjack yaptınız!)\nİkinci el Kaybettin (Bot Blackjack yaptı!)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                } else if (bj1 == false && bj2 == true) {
                    finalResult = { result: `SPLIT LOSE-TIE`, method: `İlk el Kaybettin (Bot Blackjack yaptı!)\nİkinci el Berabere! (Bot ve siz Blackjack yaptınız!)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                } else if (bj1 == false && bj2 == false) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `Her iki elde Kaybetin! (Bot Blackjack yaptı!)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }
            }

            else {
                let dealerrank = [dealercard[0].rank, dealercard[1].rank]
                while (dealervalue < 17) {
                    let newCard = DECK.pop()
                    dealercard.push(newCard)
                    dealerrank.push(newCard.rank)
                    if (newCard.rank == "A") {
                        if (dealerrank.includes("A")) {
                            newCard.value = 1
                        } else {
                            newCard.value = 11
                        }
                    }
                    dealervalue += newCard.value
                    if (dealervalue > 21 && dealerrank.includes("A")) {
                        let unu = 0
                        dealercard.forEach(e => {
                            if (e.rank == "A") {
                                dealercard[unu].value = 1
                                dealervalue = dealercard.map(d => d.value).reduce((a, b) => b + a)
                            }
                            unu++
                        })
                    }
                }

                if (dealervalue === 21 && dealercard.length === 2) {
                    dbj1 = true
                    dbj2 = true
                }

                if (yourvalue1 > 21 && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `Her iki elde değerini aştığından Kaybettiniz!!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 <= 21 && bj1 == false && (dealervalue < yourvalue1 || dealervalue > 21) && yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2 || dealervalue > 21)) {
                    finalResult = { result: `SPLIT WIN-WIN`, method: `Her iki eli kazandınız!!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && bj2 == true) {
                    finalResult = { result: `SPLIT WIN-WIN`, method: `Her iki eli kazandınız!! (Çifte Blackjack)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 === dealervalue && yourvalue2 === dealervalue) {
                    finalResult = { result: `SPLIT TIE-TIE`, method: `Her iki el Berabere!!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 > 21 && yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2 || dealervalue > 21)) {
                    finalResult = { result: `SPLIT LOSE-WIN`, method: `İlk el: Kaybettin (Gereğinden fazla kart).\nİkinci el: Kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 <= 21 && bj1 == false && (dealervalue < yourvalue1 || dealervalue > 21) && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT WIN-LOSE`, method: `İlk el: Kazandın!!\nİkinci el: Kaybettin (Gereğinden fazla kart).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 > 21 && bj2 == true) {
                    finalResult = { result: `SPLIT LOSE-WIN`, method: `İlk el: Kaybettin (Gereğinden fazla kart).\nİkinci el: Blackjack ile kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT WIN-LOSE`, method: `İlk el: Blackjack ile kazandın!!\nİkinci el: Kaybettin (Gereğinden fazla kart).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 > 21 && yourvalue2 === dealervalue) {
                    finalResult = { result: `SPLIT LOSE-TIE`, method: `İlk el: Kaybettin (Gereğinden fazla kart).\nİkinci el: Berabere!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 === dealervalue && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT TIE-LOSE`, method: `İlk el: Berabere!!\nİkinci el: Kaybettin (Gereğinden fazla kart).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2 || dealervalue > 21)) {
                    finalResult = { result: `SPLIT WIN-WIN`, method: `İlk el: Blackjack ile kazandın!.\nİkinci el: Daha yüksek değerle kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 <= 21 && bj1 == false && (dealervalue < yourvalue1 || dealervalue > 21) && bj2 == true) {
                    finalResult = { result: `SPLIT WIN-WIN`, method: `İlk el: Daha yüksek değerle kazandın!.\nİkinci el: Blackjack ile kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && yourvalue2 === dealervalue) {
                    finalResult = { result: `SPLIT WIN-TIE`, method: `İlk el: Blackjack ile kazandın!.\nİkinci el: Berabere!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 === dealervalue && bj2 == true) {
                    finalResult = { result: `SPLIT TIE-WIN`, method: `İlk el: Berabere!.\nİkinci el: Blackjack ile kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 <= 21 && bj1 == false && (dealervalue < yourvalue1 || dealervalue > 21) && yourvalue2 === dealervalue) {
                    finalResult = { result: `SPLIT WIN-TIE`, method: `İlk el: Daha yüksek değerle kazandın!.\nİkinci el: Berabere!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 === dealervalue && yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2 || dealervalue > 21)) {
                    finalResult = { result: `SPLIT TIE-WIN`, method: `İlk el: Berabere!.\nİkinci el: Daha yüksek değerle kazandın!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (dbj1 == true && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `Her iki eli Kaybettiniz!! (Bot Blackjack yaptı)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue1 && dealervalue <= 21) && dbj2 == true) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `Her iki eli Kaybettiniz!! (Bot Blackjack yaptı)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (dbj1 == true && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `İlk El: Kaybettin (Bot Blackjack yaptı). \nİkinci El: Kaybettin (Gereğinden fazla kart).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 > 21 && dbj2 == true) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `İlk El: Kaybettin (Gereğinden fazla kart). \nİkinci El: Kaybettin (Bot Blackjack yaptı).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (dbj1 == true && yourvalue2 === dealervalue) {
                    finalResult = { result: `SPLIT LOSE-TIE`, method: `İlk El: Kaybettin (Bot Blackjack yaptı). \nİkinci El: Berabere!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 === dealervalue && dbj2 == true) {
                    finalResult = { result: `SPLIT TIE-LOSE`, method: `İlk El: Berabere! \nİkinci El: Kaybettin (Bot Blackjack yaptı).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue1 && dealervalue <= 21) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT LOSE-LOSE`, method: `Her iki eli Kaybettiniz!! (Botun eli daha yüksek)`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue1 <= 21 && bj1 == false && (dealervalue < yourvalue1 || dealervalue > 21) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT WIN-LOSE`, method: `İlk El: Kazandınız (Botu geçtiniz).\nİkinci el: Kaybettiniz (Bot eli daha yüksek).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue1 && dealervalue <= 21) && (yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2 || dealervalue > 21))) {
                    finalResult = { result: `SPLIT LOSE-WIN`, method: `İlk El: Kaybettiniz (Botun eli daha yüksek).\nİkinci el: Kazandınız (Botu geçtiniz).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT WIN-LOSE`, method: `İlk El: Kazandınız (Blackjack).\nİkinci el: Kaybettiniz (Botun eli daha yüksek).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue1 && dealervalue <= 21) && bj2 == true) {
                    finalResult = { result: `SPLIT LOSE-WIN`, method: `İlk El: Kaybettiniz (Botun eli daha yüksek).\nİkinci el: Kazandınız (Blackjack).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue1 && dealervalue <= 21) && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT LOSE-TIE`, method: `İlk el: Kaybettin (Botun eli daha yüksek).\nİkinci El: Berabere!`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue1) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT TIE-LOSE`, method: `İlk el: Berabere!.\nİkinci El: Kaybettin (Botun eli daha yüksek).`, ycard: yourcard1, ycard2: yourcard2, dcard: dealercard }
                }

                if (options.isFirstSplitDouble === true && options.isSecondSplitDouble === true) {
                    finalResult.result = `SPLIT DOUBLE ${finalResult.result.replace("SPLIT ", "")}`
                }

                else if (options.isFirstSplitDouble === true && options.isSecondSplitDouble !== true) {
                    finalResult.result = `SPLIT DOUBLE ${finalResult.result.replace("SPLIT ", "").split("-")[0]}-${finalResult.result.replace("SPLIT ", "").split("-")[1]}`
                }

                else if (options.isFirstSplitDouble !== true && options.isSecondSplitDouble === true) {
                    finalResult.result = `SPLIT ${finalResult.result.replace("SPLIT ", "").split("-")[0]}-DOUBLE ${finalResult.result.replace("SPLIT ", "").split("-")[1]}`
                }

                if (finalResult.result.includes("DOUBLE WIN-DOUBLE WIN")) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE WIN`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE LOSE-DOUBLE LOSE")) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Gereğinden fazla kart) (Çift).\nİkinci El: Kaybettin (Gereğinden fazla kart) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE WIN-DOUBLE LOSE")) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE LOSE`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Kaybettin (Gereğinden fazla kart) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE LOSE-DOUBLE WIN")) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE WIN`, method: `İlk El: Kaybettin (Gereğinden fazla kart) (Çift).\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE BLACKJACK-DOUBLE WIN")) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE WIN`, method: `İlk El: Çifte blackjack yaparak kazandın!!\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE WIN-DOUBLE BLACKJACK")) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE BLACKJACK`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE BLACKJACK-DOUBLE BLACKJACK")) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE BLACKJACK`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE TIE-DOUBLE TIE")) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE TIE`, method: `İlk El: Berabere (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE LOSE-DOUBLE TIE")) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE TIE`, method: `İlk El: Kaybettin (Başarısız) (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE TIE-DOUBLE LOSE")) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE LOSE`, method: `İlk El: Berabere (Çift).\nİkinci El: Kaybettin (Başarısız) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE WIN-DOUBLE TIE")) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE TIE`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE TIE-DOUBLE WIN")) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE WIN`, method: `İlk El: Berabere (Çift).\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE BLACKJACK-DOUBLE TIE")) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE TIE`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE TIE-DOUBLE BLACKJACK")) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE BLACKJACK`, method: `İlk El: Berabere (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE BLACKJACK-DOUBLE LOSE")) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE LOSE`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (finalResult.result.includes("DOUBLE LOSE-DOUBLE BLACKJACK")) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE BLACKJACK`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (dbj1 == true && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Bot, Blackjack yaptı) (Çift).\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && dbj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Kaybettin (Bot, Blackjack yaptı) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }


                else if (dbj1 == true && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Bot, Blackjack yaptı) (Çift).\nİkinci El: Kaybettin (Başarısız) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue > 21 && dbj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Başarısız) (Çift).\nİkinci El: Kaybettin (Bot, Blackjack yaptı) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((yourvalue <= 21 && bj1 == false && (dealervalue < yourvalue)) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE LOSE`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && (yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2))) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE WIN`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE LOSE`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && bj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE BLACKJACK`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue > 21 && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Başarısız) (Çift).\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE LOSE`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Kaybettin (Başarısız) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (yourvalue > 21 && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE TIE`, method: `İlk El: Kaybettin (Başarısız) (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && yourvalue2 > 21) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE LOSE`, method: `İlk El: Berabere (Çift).\nİkinci El: Kaybettin (Başarısız) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE BLACKJACK-DOUBLE TIE`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && bj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE BLACKJACK`, method: `İlk El: Berabere (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }


                else if ((yourvalue <= 21 && bj1 == false && (dealervalue < yourvalue)) && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE TIE`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && (yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2))) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE WIN`, method: `İlk El: Berabere (Çift).\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (dbj1 == true && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE TIE`, method: `İlk El: Kaybettin (Bot, Blackjack yaptı) (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && dbj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE LOSE`, method: `İlk El: Berabere (Çift).\nİkinci El: Kaybettin (Bot, Blackjack yaptı) (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue > yourvalue && dealervalue <= 21) && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE LOSE-DOUBLE TIE`, method: `İlk El: Kaybettin (Bot, daha fazlasına sahip) (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && (dealervalue > yourvalue2 && dealervalue <= 21)) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE LOSE`, method: `İlk El: Berabere (Çift).\nİkinci El: Kaybettin (Bot, daha fazlasına sahip) (Çift).`, ycard: yourcard, yourcard2: yourcard2, dcard: dealercard }
                }

                else if ((dealervalue === yourvalue) && (dealervalue === yourvalue2)) {
                    finalResult = { result: `SPLIT DOUBLE TIE-DOUBLE TIE`, method: `İlk El: Berabere (Çift).\nİkinci El: Berabere (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if ((yourvalue <= 21 && bj1 == false && (dealervalue < yourvalue)) && bj2 == true) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE WIN`, method: `İlk El: Daha fazla puanla kazandın (Çift).\nİkinci El: Çifte blackjack yaparak kazandın!`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }

                else if (bj1 == true && (yourvalue2 <= 21 && bj2 == false && (dealervalue < yourvalue2))) {
                    finalResult = { result: `SPLIT DOUBLE WIN-DOUBLE WIN`, method: `İlk El: Çifte blackjack yaparak kazandın!\nİkinci El: Daha fazla puanla kazandın (Çift).`, ycard: yourcard, ycard2: yourcard2, dcard: dealercard }
                }
            }

            return finalResult
        }

        if (options.isSplit === "second") {

            options.isSplit = "done";
            if (options.isDoubleDown !== true) {
                if (yourvalue > 21) {
                    finalResult2 = { result: "LOSE", method: "Kaybettin", ycard: yourcard, dcard: dealercard }
                } else if (yourvalue === 21) {
                    finalResult2 = { result: "WIN", method: "Blackjack yaptın", ycard: yourcard, dcard: dealercard }
                } else if (yourvalue < 21 && dealervalue < yourvalue) {
                    finalResult2 = { result: "WIN", method: "Daha fazlasına sahipsin", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue > yourvalue && dealervalue > 21 && yourvalue < 21) {
                    finalResult2 = { result: "WIN", method: "Bot kaybetti", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue === 21 && yourvalue < 21) {
                    finalResult2 = { result: "LOSE", method: "Bot, Blackjack yaptı", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue > yourvalue && dealervalue < 21) {
                    finalResult2 = { result: "LOSE", method: "Bot, daha fazlasına sahip", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue === yourvalue) {
                    finalResult2 = { result: "TIE", method: "Berabere", ycard: yourcard, dcard: dealercard }
                }
            } else if (options.isDoubleDown === true) {
                if (yourvalue > 21) {
                    finalResult2 = { result: "DOUBLE LOSE", method: "Kaybettin", ycard: yourcard, dcard: dealercard }
                } else if (yourvalue === 21) {
                    finalResult2 = { result: "DOUBLE WIN", method: "Blackjack yaptın", ycard: yourcard, dcard: dealercard }
                } else if (yourvalue < 21 && dealervalue < yourvalue) {
                    finalResult2 = { result: "DOUBLE WIN", method: "Daha fazlasına sahipsin", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue > yourvalue && dealervalue > 21 && yourvalue < 21) {
                    finalResult2 = { result: "DOUBLE WIN", method: "Bot kaybetti", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue === 21 && yourvalue < 21) {
                    finalResult2 = { result: "DOUBLE LOSE", method: "Bot, Blackjack yaptı", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue > yourvalue && dealervalue < 21) {
                    finalResult2 = { result: "DOUBLE LOSE", method: "Bot, daha fazlasına sahip", ycard: yourcard, dcard: dealercard }
                } else if (dealervalue === yourvalue) {
                    finalResult2 = { result: "DOUBLE TIE", method: "Berabere", ycard: yourcard, dcard: dealercard }
                }
            }
            if (options.transition === "edit") {
                message = await message.edit({ embeds: message.embeds, components: [] })
                finalResult2.message = message
            } else {
                await message.delete()
            }
            return finalResult2
        } else {

            if ((dealervalue === 21 && dealercard.length === 2)) {
                if (options.hasInsurance == true) {
                    finalResult = { result: "INSURANCE PAYOUT", method: "Botun blackjack'ine karşı garanti aldınız. Paranız tekrardan size verildi!", ycard: yourcard, dcard: dealercard }
                    if (options.transition === "edit") {
                        message = await message.edit({ embeds: message.embeds, components: [] })
                        finalResult2.message = message
                    } else {
                        await message.delete()
                    }
                    return finalResult
                }
                else {
                    finalResult = { result: "LOSE", method: "Kaybettiniz. Kazanmanız dileğiyle... (Bot, Blackjack ile kazandı)", ycard: yourcard, dcard: dealercard }
                    if (options.transition === "edit") {
                        message = await message.edit({ embeds: message.embeds, components: [] })
                        finalResult2.message = message
                    } else {
                        await message.delete()
                    }
                    return finalResult
                }
            }

            else {
                let dealerrank = [dealercard[0].rank, dealercard[1].rank]
                let finalResult = {}
                while (dealervalue < 17) {
                    let newCard = DECK.pop()
                    dealercard.push(newCard)
                    dealerrank.push(newCard.rank)
                    if (newCard.rank == "A") {
                        if (dealerrank.includes("A")) {
                            newCard.value = 1
                        } else {
                            newCard.value = 11
                        }
                    }
                    dealervalue += newCard.value
                    if (dealervalue > 21 && dealerrank.includes("A")) {
                        let unu = 0
                        dealercard.forEach(e => {
                            if (e.rank == "A") {
                                dealercard[unu].value = 1
                                dealervalue = dealercard.map(d => d.value).reduce((a, b) => b + a)
                            }
                            unu++
                        })
                    }
                }

                if (options.hasInsurance == true) {
                    if (yourvalue > 21) {
                        finalResult = { result: "INSURANCE LOSE", method: "Kaybettiniz. Kazanmanız dileğiyle...", ycard: yourcard, dcard: dealercard }
                    } else if ((yourvalue <= 21 && (dealervalue < yourvalue))) {
                        finalResult = { result: "INSURANCE WIN", method: "Daha fazla puanla kazandın.", ycard: yourcard, dcard: dealercard }
                    } else if ((dealervalue > yourvalue && dealervalue > 21 && yourvalue <= 21)) {
                        finalResult = { result: "INSURANCE WIN", method: "Kazandın!", ycard: yourcard, dcard: dealercard }
                    } else if ((dealervalue > yourvalue && dealervalue <= 21)) {
                        finalResult = { result: "INSURANCE LOSE", method: "Kaybettin (Bot, daha fazlasına sahip).", ycard: yourcard, dcard: dealercard }
                    } else if (dealervalue === yourvalue) {
                        finalResult = { result: "INSURANCE TIE", method: "Berabere!", ycard: yourcard, dcard: dealercard }
                    }
                }
                else if (options.hasInsurance !== true) {
                    if (options.isDoubleDown !== true) {
                        if (yourvalue > 21) {
                            finalResult = { result: "LOSE", method: "Kaybettiniz. Kazanmanız dileğiyle...", ycard: yourcard, dcard: dealercard }
                        } else if ((yourvalue <= 21 && (dealervalue < yourvalue))) {
                            finalResult = { result: "WIN", method: "Daha fazla puanla kazandın.", ycard: yourcard, dcard: dealercard }
                        } else if ((dealervalue > yourvalue && dealervalue > 21 && yourvalue <= 21)) {
                            finalResult = { result: "WIN", method: "Kazandın!", ycard: yourcard, dcard: dealercard }
                        } else if ((dealervalue > yourvalue && dealervalue <= 21)) {
                            finalResult = { result: "LOSE", method: "Kaybettin (Bot, daha fazlasına sahip).", ycard: yourcard, dcard: dealercard }
                        } else if (dealervalue === yourvalue) {
                            finalResult = { result: "TIE", method: "Berabere!", ycard: yourcard, dcard: dealercard }
                        }
                    } else if (options.isDoubleDown === true) {
                        if (yourvalue > 21) {
                            finalResult = { result: "DOUBLE LOSE", method: "Double: Kaybettin.", ycard: yourcard, dcard: dealercard }
                        } else if ((yourvalue <= 21 && (dealervalue < yourvalue))) {
                            finalResult = { result: "DOUBLE WIN", method: "Double: Daha fazla puanla kazandın.", ycard: yourcard, dcard: dealercard }
                        } else if ((dealervalue > yourvalue && dealervalue > 21 && yourvalue <= 21)) {
                            finalResult = { result: "DOUBLE WIN", method: "Double: Kazandın!", ycard: yourcard, dcard: dealercard }
                        } else if ((dealervalue > yourvalue && dealervalue <= 21)) {
                            finalResult = { result: "DOUBLE LOSE", method: "Double: Kaybettin (Bot, daha fazlasına sahip).", ycard: yourcard, dcard: dealercard }
                        } else if (dealervalue === yourvalue) {
                            finalResult = { result: "DOUBLE TIE", method: "Double: Berabere!", ycard: yourcard, dcard: dealercard }
                        }
                    }
                }

                if (options.transition === "edit") {
                    message = await message.edit({ embeds: message.embeds, components: [] })
                    finalResult.message = message
                } else {
                    await message.delete()
                }
                return finalResult
            }
        }
    }


    async doubledown(message, userId, yourcard, dealercard, DECK, options) {
        options.isDoubleDown = true
        if (options.isSplit === "first") {
            options.isFirstSplitDouble = true
        }
        if (options.isSplit === "second") {
            options.isSecondSplitDouble = true
        }
        let isSoft = false
        let newCard = DECK.pop()
        if (newCard.rank === "A") {
            if (yourcard.map(c => c.rank).includes("A")) {
                newCard.value = 1
            } else {
                newCard.value = 11
            }
        }

        yourcard.push(newCard)

        if (yourcard.map(c => c.rank).includes("A") && yourcard.find(c => c.rank === "A" && c.value === 11)) {
            isSoft = true
        }

        if (yourcard.map(c => c.value).reduce((a, b) => b + a) > 21 && isSoft == true) {
            isSoft = false
            for (let y = 0; y < yourcard.length; y++) {
                if (yourcard[y].rank === "A") {
                    yourcard[y].value = 1
                }
            }
        }

        return this.stand(message, userId, yourcard, dealercard, DECK, options)
    }

    async insurance(message, userId, yourcard, dealercard, DECK, options) {
        options.hasInsurance = true
        let dealervalue = dealercard.map(c => c.value).reduce((a, b) => b + a)

        if (dealervalue === 21) {
            return this.stand(message, userId, yourcard, dealercard, DECK, options)
        }

        else {
            let embed = options.embed
            let hitbtn = { label: "Vur", style: 1, custom_id: "discord-blackjack-hitbtn", type: 2 }
            let standbtn = { label: "Dur", style: 1, custom_id: "discord-blackjack-standbtn", type: 2 }
            let ddownbtn = { label: "Çift Düşüş", style: 1, custom_id: "discord-blackjack-ddownbtn", type: 2 }
            let splitbtn = { label: "Böl", style: 1, custom_id: "discord-blackjack-splitbtn", type: 2 }
            let cancelbtn = { label: "İptal", style: 4, custom_id: "discord-blackjack-cancelbtn", type: 2 }
            let row1 = { type: 1, components: [hitbtn, standbtn] }
            let row2 = { type: 1, components: [cancelbtn] }
            let components = [row1]
            while (components.length == 2 && components[0].components.length > 2) {
                components[0].components.pop()
            }
            if (options.transition === "edit") {
                if (options.commandType === "message") {
                    message = await message.edit({ embeds: [embed], components })
                } else {
                    message = await message.edit({ embeds: [embed], components })
                }
            } else {
                if (options.commandType === "message") {
                    await message.delete()
                    message = await message.channel.send({ embeds: [embed], components })
                } else {
                    if (!message.ephemeral) {
                        await message.delete()
                    }
                    message = await message.channel.send({ embeds: [embed], components })
                }
            }
            return options.buttons ? this.buttonCollect(message, userId, yourcard, dealercard, DECK, options) : this.messageCollect(message, userId, yourcard, dealercard, DECK, options)
        }
    }

    async noinsurance(message, userId, yourcard, dealercard, DECK, options) {
        options.hasInsurance = false
        let dealervalue = dealercard.map(c => c.value).reduce((a, b) => b + a)

        if (dealervalue === 21) {
            return this.stand(message, userId, yourcard, dealercard, DECK, options)
        }

        else {
            let embed = options.embed
            let hitbtn = { label: "Vur", style: 1, custom_id: "discord-blackjack-hitbtn", type: 2 }
            let standbtn = { label: "Dur", style: 1, custom_id: "discord-blackjack-standbtn", type: 2 }
            let ddownbtn = { label: "Çift Düşüş", style: 1, custom_id: "discord-blackjack-ddownbtn", type: 2 }
            let splitbtn = { label: "Böl", style: 1, custom_id: "discord-blackjack-splitbtn", type: 2 }
            let cancelbtn = { label: "İptal", style: 4, custom_id: "discord-blackjack-cancelbtn", type: 2 }
            let row1 = { type: 1, components: [hitbtn, standbtn] }
            let row2 = { type: 1, components: [cancelbtn] }
            let components = [row1]
            while (components.length == 2 && components[0].components.length > 2) {
                components[0].components.pop()
            }
            if (options.transition === "edit") {
                if (options.commandType === "message") {
                    message = await message.edit({ embeds: [embed], components })
                } else {
                    message = await message.edit({ embeds: [embed], components })
                }
            } else {
                if (options.commandType === "message") {
                    await message.delete()
                    message = await message.channel.send({ embeds: [embed], components })
                } else {
                    if (!message.ephemeral) {
                        await message.delete()
                    }
                    message = await message.channel.send({ embeds: [embed], components })
                }
            }
            return options.buttons ? this.buttonCollect(message, userId, yourcard, dealercard, DECK, options) : this.messageCollect(message, userId, yourcard, dealercard, DECK, options)
        }
    }

    async split(message, userId, yourcard, dealercard, DECK, options) {
        options.isSplit = "first"
        let yourcard2 = [yourcard.pop()]

        if (yourcard[0].rank === "A") {
            yourcard[0].value = 11
        }

        if (yourcard2[0].rank === "A") {
            yourcard2[0].value = 11
        }

        options.secondHand = yourcard2

        return this.hit(message, userId, yourcard, dealercard, DECK, options)

    }

    async cancel(message, userId, yourcard, dealercard, DECK, options) {
        if (options.transition === "edit") {
            return {
                result: "CANCEL",
                method: "None",
                ycard: yourcard,
                dcard: dealercard,
                message: message
            }
        } else {
            return {
                result: "CANCEL",
                method: "None",
                ycard: yourcard,
                dcard: dealercard
            }
        }

    }
}

module.exports = Collect
