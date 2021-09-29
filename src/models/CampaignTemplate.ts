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
export class CampaignTemplate extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public channel: string;

    @Column({ nullable: true })
    public post: string;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.campaignTemplates)
    public campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CampaignTemplate {
        return {
            ...this,
            campaign: this.campaign.asV1(),
        };
    }

    public static async saveTemplate(data: any, campaign: Campaign): Promise<CampaignTemplate> {
        let template = new CampaignTemplate();
        template.post = data.post;
        template.channel = data.channel;
        template.campaign = campaign;
        return await CampaignTemplate.save(template);
    }

    public static async saveMultipleTemplates(list: any, campaign: Campaign): Promise<CampaignTemplate[]> {
        let templates: CampaignTemplate[] = [];
        list.forEach((item: any) => {
            let template = new CampaignTemplate();
            template.post = item.post;
            template.channel = item.channel;
            template.campaign = campaign;
            templates.push(template);
        });
        return await CampaignTemplate.save(templates);
    }
}
