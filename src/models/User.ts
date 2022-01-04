import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
} from "typeorm";
import { Participant } from "./Participant";
import { XoxodayOrder } from "./XoxodayOrder";
import { Wallet } from "./Wallet";
import { SocialLink } from "./SocialLink";
import { SocialPost } from "./SocialPost";
import { FactorLink } from "./FactorLink";
import { TwentyFourHourMetric } from "./TwentyFourHourMetric";
import BigNumber from "bignumber.js";
import { BN } from "../util/helpers";
import { FieldNode } from "graphql";
import { Profile } from "./Profile";
import { DailyParticipantMetric } from "./DailyParticipantMetric";
import { NotificationSettings } from "./NotificationSettings";
import { Admin } from "./Admin";
import { ExternalAddress } from "./ExternalAddress";
import { KycStatus } from "../types";
import { VerificationApplication } from "./VerificationApplication";
import { WalletCurrency } from "./WalletCurrency";
import { differenceInMonths } from "date-fns";
import { Transfer } from "./Transfer";
import { JWTPayload } from "src/types";

export const LOGIN_REWARD_AMOUNT = 1;
export const PARTICIPATION_REWARD_AMOUNT = 2;
export const REGISTRATION_REWARD_AMOUNT = 15;
type RewardType = "LOGIN_REWARD" | "PARTICIPATION_REWARD" | "REGISTRATION_REWARD";

@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public identityId: string;

    @Column({ nullable: false })
    public email: string;

    @Column({ nullable: false })
    public password: string;

    @Column({ default: true })
    public active: boolean;

    @Column({ nullable: true, default: "" })
    public kycStatus: KycStatus;

    @OneToMany((_type) => SocialPost, (posts) => posts.user)
    public posts: SocialPost[];

    @Column({ nullable: true })
    public lastLogin: Date;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @OneToMany((_type) => Participant, (participant) => participant.user)
    campaigns: Participant[];

    @OneToOne((_type) => Wallet, (wallet) => wallet.user)
    public wallet: Wallet;

    @OneToMany((_type) => ExternalAddress, (address) => address.user)
    public addresses: ExternalAddress[];

    @OneToMany((_type) => SocialLink, (link) => link.user)
    public socialLinks: SocialLink[];

    @OneToMany((_type) => VerificationApplication, (verification) => verification.user)
    public identityVerifications: VerificationApplication[];

    @OneToMany((_type) => FactorLink, (link) => link.user)
    public factorLinks: FactorLink[];

    @OneToMany((_type) => TwentyFourHourMetric, (metrics) => metrics.user)
    public twentyFourHourMetrics: TwentyFourHourMetric[];

    @OneToOne((_type) => Profile, (profile) => profile.user, { eager: true })
    public profile: Profile;

    @OneToOne((_type) => NotificationSettings, (notifications) => notifications.user)
    public notificationSettings: NotificationSettings;

    @OneToMany((_type) => DailyParticipantMetric, (metric) => metric.user)
    public dailyMetrics: DailyParticipantMetric[];

    @OneToMany((_type) => Admin, (admin) => admin.user)
    public admins: Admin[];

    @OneToMany((_type) => XoxodayOrder, (order) => order.user)
    public orders: XoxodayOrder[];

    @BeforeInsert()
    nameToUpperCase() {
        this.email = this.email ? this.email.toLowerCase() : this.email;
    }

    public static async initNewUser(email: string, password: string, username: string): Promise<User> {
        const user = new User();
        const wallet = new Wallet();
        const coiinWallet = new WalletCurrency();
        const profile = new Profile();
        const notificationSettings = new NotificationSettings();
        user.email = email;
        user.password = password;
        coiinWallet.type = "coiin";
        coiinWallet.balance = new BN(0);
        await user.save();
        wallet.user = user;
        await wallet.save();
        coiinWallet.wallet = wallet;
        await coiinWallet.save();
        profile.username = username;
        profile.user = user;
        await profile.save();
        notificationSettings.user = user;
        await notificationSettings.save();
        user.profile = profile;
        user.notificationSettings = notificationSettings;
        return await user.save();
    }

    public asV1() {
        let { password, ...returnedUser }: any = { ...this };
        if (this.profile) {
            const { id, ...values } = this.profile;
            returnedUser = {
                ...returnedUser,
                ...values,
                email: returnedUser.email,
                hasRecoveryCodeSet: this.profile.recoveryCode !== null && this.profile.recoveryCode !== "",
            };
        }
        try {
            if (this.posts && this.posts.length > 0) {
                returnedUser.posts = this.posts.map((post) => post.asV1());
            }
            if (this.twentyFourHourMetrics && this.twentyFourHourMetrics.length > 0) {
                returnedUser.twentyFourHourMetrics = this.twentyFourHourMetrics.map((metric) => metric.asV1());
            }
            if (this.wallet) {
                returnedUser.wallet = this.wallet.asV1();
            }
            if (this.campaigns && this.campaigns.length > 0) {
                returnedUser.campaigns = this.campaigns.map((participant) => participant.asV1());
            }
            if (this.orders && this.orders.length > 0) {
                returnedUser.orders = this.orders.map((order) => order.asV1());
            }
        } catch (e) {
            console.log(e);
        }
        return returnedUser;
    }

    public async updateCoiinBalance(operation: "ADD" | "SUBTRACT", amount: number): Promise<any> {
        let user: User | undefined = this;
        if (!user.wallet || !user.wallet.walletCurrency) {
            user = await User.findOne({ where: { id: this.id }, relations: ["wallet", "wallet.walletCurrency"] });
        }
        if (user) {
            const coiinBalance = user.wallet.walletCurrency.find((item) => item.type.toLowerCase() === "coiin");
            if (coiinBalance) {
                coiinBalance.balance =
                    operation === "ADD" ? coiinBalance.balance.plus(amount) : coiinBalance.balance.minus(amount);
                return coiinBalance.save();
            }
        }
    }

    public async updateKycStatus(status: KycStatus) {
        if (this.kycStatus !== status && this.kycStatus !== "APPROVED") {
            this.kycStatus = status;
            return await this.save();
        }
        return this;
    }

    public async updateLastLogin() {
        this.lastLogin = new Date();
        return await this.save();
    }

    public async updateEmailPassword(email: string, password: string) {
        this.email = email;
        this.password = password;
        return await this.save();
    }

    public static async findUserByContext(data: JWTPayload, relations?: string[]) {
        const { id, userId } = data;
        return await User.findOne({
            where: [{ identityId: id }, { id: userId }],
            ...(relations && { relations: ["socialLinks"] }),
        });
    }

    public transferReward = async (type: RewardType): Promise<any> => {
        const user = this;
        const wallet = await Wallet.findOne({ where: { user } });
        if (!wallet) throw new Error("User wallet not found");
        let accountAgeInHours = 0,
            thisWeeksReward;
        if (type === "LOGIN_REWARD") accountAgeInHours = differenceInMonths(new Date(), new Date(user.createdAt));
        if (type === "LOGIN_REWARD" || type === "PARTICIPATION_REWARD")
            thisWeeksReward = await Transfer.getRewardForThisWeek(wallet, type);
        const amount =
            type === "REGISTRATION_REWARD"
                ? REGISTRATION_REWARD_AMOUNT
                : type === "PARTICIPATION_REWARD"
                ? PARTICIPATION_REWARD_AMOUNT
                : LOGIN_REWARD_AMOUNT;
        if (
            (type === "LOGIN_REWARD" && accountAgeInHours > 24 && !thisWeeksReward) ||
            (type === "PARTICIPATION_REWARD" && !thisWeeksReward) ||
            type === "REGISTRATION_REWARD"
        ) {
            await user.updateCoiinBalance("ADD", amount);
            await Transfer.newReward({
                wallet,
                type,
                symbol: "COIN",
                amount: new BN(amount),
            });
        }
    };

    public static async getUsersForDailyMetricsCron(): Promise<User[]> {
        return await this.createQueryBuilder("user")
            .leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id')
            .leftJoinAndSelect("user.notificationSettings", "notifications", 'notifications."userId" = user.id')
            .leftJoinAndSelect("user.campaigns", "part", 'part."userId" = user.id')
            .leftJoinAndSelect("part.campaign", "campaign", 'part."campaignId" = campaign.id')
            .leftJoinAndSelect("campaign.participants", "participants", 'participants."campaignId" = campaign.id')
            .getMany();
    }

    public static async getAllDeviceTokens(action?: "campaignCreate" | "campaignUpdates"): Promise<string[]> {
        let query = this.createQueryBuilder("user")
            .leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id')
            .leftJoinAndSelect("user.notificationSettings", "settings", 'settings."userId" = user.id')
            .select('profile."deviceToken"')
            .distinctOn(['profile."deviceToken"'])
            .where(`profile."deviceToken" != NULL AND profile."deviceToken" != ''`);
        if (action === "campaignCreate") query = query.andWhere('settings."campaignCreate" = true');
        if (action === "campaignUpdates") query = query.andWhere('settings."campaignUpdates" = true');
        const values = await query.getRawMany();
        return values.map((value) => value.deviceToken);
    }

    public static async getUserTotalParticipationScore(userId: String): Promise<BigNumber> {
        const { sum } = await this.createQueryBuilder("user")
            .leftJoin("user.campaigns", "campaign")
            .where('user.id = :userId AND campaign."userId" = user.id', { userId })
            .select('SUM(CAST(campaign."participationScore" as double precision))')
            .getRawOne();
        return new BN(sum || 0);
    }

    public static async getUserTotalSocialEngagement(userId: string, socialType: string = "twitter") {
        const { likeCount, shareCount, commentCount } = await this.createQueryBuilder("user")
            .leftJoin("user.posts", "post")
            .where('user.id = :userId AND post."userId" = user.id', { userId })
            .andWhere("post.type = :socialType", { socialType })
            .select(
                'SUM(CAST(post.likes AS int)) as "likeCount", SUM(CAST(post.shares AS int)) as "shareCount", SUM(CAST(post.comments AS int)) as "commentCount"'
            )
            .getRawOne();

        return {
            likeCount: likeCount || 0,
            shareCount: shareCount || 0,
            commentCount: commentCount || 0,
        };
    }

    public static async getUser(
        data: { identityId: string; userId: string },
        graphqlQuery: FieldNode | undefined
    ): Promise<User | undefined> {
        let query = this.createQueryBuilder("user");
        if (graphqlQuery) {
            const fieldNodes = graphqlQuery.selectionSet?.selections.filter((node) => node.kind === "Field") || [];
            const loadParticipants = fieldNodes.find((node: FieldNode) => node.name.value === "campaigns") as FieldNode;
            const loadOrders = fieldNodes.find((node: FieldNode) => node.name.value === "orders") as FieldNode;
            const loadSocialLinks = fieldNodes.find(
                (node: FieldNode) => node.name.value === "socialLinks"
            ) as FieldNode;
            const loadPosts = fieldNodes.find((node: FieldNode) => node.name.value === "posts") as FieldNode;
            const loadTwentyFourHourMetrics = fieldNodes.find(
                (node: FieldNode) => node.name.value === "twentyFourHourMetrics"
            ) as FieldNode;
            const loadWallet = fieldNodes.find((node: FieldNode) => node.name.value === "wallet") as FieldNode;
            const loadFactorLinks = fieldNodes.find(
                (node: FieldNode) => node.name.value === "factorLinks"
            ) as FieldNode;
            const loadNotificationSettings = fieldNodes.find(
                (node: FieldNode) => node.name.value === "notificationSettings"
            ) as FieldNode;
            const loadAddresses = fieldNodes.find((node: FieldNode) => node.name.value === "addresses") as FieldNode;

            if (loadParticipants) {
                query = query.leftJoinAndSelect("user.campaigns", "participant", 'participant."userId" = user.id');
                const subFields =
                    loadParticipants.selectionSet?.selections.filter((node) => node.kind === "Field") || [];
                const loadParticipantCampaign = subFields.find(
                    (node: FieldNode) => node.name.value === "campaign"
                ) as FieldNode;
                if (loadParticipantCampaign) {
                    query = query.leftJoinAndSelect(
                        "participant.campaign",
                        "campaign",
                        'participant."campaignId" = campaign.id'
                    );
                    const subFields =
                        loadParticipantCampaign.selectionSet?.selections.filter((node) => node.kind === "Field") || [];
                    const loadParticipantsOfCampaign = subFields.find(
                        (node: FieldNode) => node.name.value === "participants"
                    ) as FieldNode;
                    const loadCampaignCrypto = subFields.find(
                        (node: FieldNode) => node.name.value === "participants"
                    ) as FieldNode;
                    if (loadCampaignCrypto) {
                        query = query.leftJoinAndSelect("campaign.crypto", "crypto", 'campaign."cryptoId" = crypto.id');
                    }
                    if (loadParticipantsOfCampaign) {
                        query = query.leftJoinAndSelect(
                            "campaign.participants",
                            "part",
                            'part."campaignId" = campaign.id'
                        );
                        const subFields =
                            loadParticipantsOfCampaign.selectionSet?.selections.filter(
                                (node) => node.kind === "Field"
                            ) || [];
                        const loadUserOfParticipant = subFields.find((node: FieldNode) => node.name.value === "user");
                        if (loadUserOfParticipant) {
                            query = query.leftJoinAndSelect("part.user", "u");
                        }
                    }
                }
            }
            if (loadWallet) {
                query = query.leftJoinAndSelect("user.wallet", "wallet", 'wallet."userId" = user.id');
                const subFields = loadWallet.selectionSet?.selections.filter((node) => node.kind === "Field") || [];
                const loadTransfers = subFields.find((node: FieldNode) => node.name.value === "transfers") as FieldNode;
                const loadCurrencies = subFields.find(
                    (node: FieldNode) => node.name.value === "walletCurrency"
                ) as FieldNode;
                if (loadTransfers) {
                    query = query.leftJoinAndSelect("wallet.transfers", "transfer", 'transfer."walletId" = wallet.id');
                    const transferFields =
                        loadTransfers.selectionSet?.selections.filter((node) => node.kind === "Field") || [];
                    const loadCampaign = transferFields.find(
                        (node: FieldNode) => node.name.value === "campaign"
                    ) as FieldNode;
                    if (loadCampaign) {
                        query = query.leftJoinAndSelect("transfer.campaign", "c", 'c.id = transfer."campaignId"');
                    }
                }
                if (loadCurrencies)
                    query = query.leftJoinAndSelect(
                        "wallet.walletCurrency",
                        "wallet_currency",
                        'wallet_currency."walletId" = wallet.id'
                    );
            }
            if (loadSocialLinks)
                query = query.leftJoinAndSelect("user.socialLinks", "social", 'social."userId" = user.id');
            if (loadPosts) query = query.leftJoinAndSelect("user.posts", "post", 'post."userId" = user.id');
            if (loadTwentyFourHourMetrics)
                query = query.leftJoinAndSelect("user.twentyFourHourMetrics", "metric", 'metric."userId" = user.id');
            if (loadFactorLinks)
                query = query.leftJoinAndSelect("user.factorLinks", "factor", 'factor."userId" = user.id');
            if (loadNotificationSettings)
                query = query.leftJoinAndSelect("user.notificationSettings", "settings", 'settings."userId" = user.id');
            if (loadAddresses)
                query = query.leftJoinAndSelect("user.addresses", "address", 'address."userId" = user.id');
            if (loadOrders) query = query.leftJoinAndSelect("user.orders", "orders", 'orders."userId" = user.id');
        }
        query = query.leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id');
        query = query.where("user.id = :id", { id: data.userId });
        query = query.where("user.identityId = :identityId", { identityId: data.identityId });
        return query.getOne();
    }
}
