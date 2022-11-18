import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Column,
} from "typeorm";
import { Campaign } from "./Campaign";

@Entity()
export class CampaignMedia extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public channel: string;

    @Column({ nullable: true })
    public media: string;

    @Column({ nullable: true })
    public mediaFormat: string;

    @Column({ nullable: true })
    public isDefault: boolean;

    @Column({ nullable: true })
    public ratio: string;

    @Column({ nullable: true })
    public slug: string;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.campaignMedia)
    public campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CampaignMedia {
        return {
            ...this,
            campaign: this.campaign.asV1(),
        };
    }

    public static async saveMedia(data: any, campaign: Campaign): Promise<CampaignMedia> {
        let media = new CampaignMedia();
        media.channel = data.channel;
        media.media = data.media;
        media.mediaFormat = data.mediaFormat;
        media.isDefault = data.isDefault;
        media.campaign = campaign;
        return await CampaignMedia.save(media);
    }

    public static async saveMultipleMedias(list: any, campaign: Campaign): Promise<CampaignMedia[]> {
        let templates: CampaignMedia[] = [];
        list.forEach((item: any) => {
            let media = new CampaignMedia();
            media.channel = item.channel;
            media.media = item.media;
            media.mediaFormat = item.mediaFormat;
            media.isDefault = item.isDefault;
            media.campaign = campaign;
            templates.push(media);
        });
        return await CampaignMedia.save(templates);
    }
}
