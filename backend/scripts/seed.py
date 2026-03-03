from datetime import date, timedelta
from uuid import uuid4

from app.core.config import settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Announcement, Event, MentorProfile, QaAnswer, QaQuestion, QaQuestionMentor, Room, User

def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create Admin
        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin:
            admin = User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                display_name="Admin",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Create Mentors and Assign Profiles
        mentors_data = [
            {
                "email": "mentor.liu@zhixin.edu",
                "display_name": "刘学长",
                "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop",
                "title": "算法竞赛｜科研规划",
                "bio": "曾获ACM-ICPC亚洲区金牌，多篇顶会论文一作。擅长算法训练指导与计算机考研/科研路线规划。",
                "tags": ["算法", "竞赛", "科研"],
            },
            {
                "email": "mentor.chen@zhixin.edu",
                "display_name": "陈学姐",
                "avatar_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop",
                "title": "大厂产品设计｜用户研究",
                "bio": "现任一线互联网大厂高级产品经理，专注交互设计与用户体验研究。可提供真实的产品迭代案例剖析。",
                "tags": ["设计", "产品", "体验"],
            },
            {
                "email": "mentor.wang@zhixin.edu",
                "display_name": "王学长",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
                "title": "互联网求职咨询｜简历优化",
                "bio": "曾担任多年校园招聘面试官。主要提供大厂求职路线建议、秋招春招时间点卡位、以及1对1简历逐行优化指导。",
                "tags": ["求职", "简历", "面试"],
            },
            {
                "email": "mentor.xu@zhixin.edu",
                "display_name": "徐学姐",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
                "title": "留学申请｜语言备考",
                "bio": "全额奖学金被常青藤名校录取，雅思8.5分。擅长文书撰写与海外读研规划。",
                "tags": ["留学", "雅思", "文书"],
            },
        ]

        mentor_users = []
        for mentor in mentors_data:
            user = db.query(User).filter(User.email == mentor["email"]).first()
            if not user:
                user = User(
                    email=mentor["email"],
                    hashed_password=hash_password("mentor123"),
                    role="mentor",
                    display_name=mentor["display_name"],
                    avatar_url=mentor["avatar_url"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            mentor_users.append(user)

            profile = db.query(MentorProfile).filter(MentorProfile.user_id == user.id).first()
            if not profile:
                db.add(
                    MentorProfile(
                        user_id=user.id,
                        title=mentor["title"],
                        bio=mentor["bio"],
                        tags=mentor["tags"],
                    )
                )

        db.commit()

        # Generate Plentiful Chinese Events
        if db.query(Event).count() == 0:
            today = date.today()
            # Generate a recurring sequence explicitly
            recurring_group_id = uuid4().hex
            events = [
                Event(
                    title="2026 人工智能前沿科技发展论坛",
                    date=today + timedelta(days=2),
                    time="14:00 - 17:00",
                    location="A区 国际学术交流中心",
                    organizer="计算机科学学院",
                    category="讲座",
                    status="open",
                    spots_left=23,
                    total_spots=150,
                    image_url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop",
                    description="本次论坛邀请到了国内外知名 AI 领域专家，共同探讨大语言模型(LLMs)、具身智能(Embodied AI) 以及下一代神经网络架构的演进趋势。现场更设有趣味问答与大咖面对面环节！",
                ),
                Event(
                    title="Python 与商业大数据分析核心工坊",
                    date=today + timedelta(days=4),
                    time="19:00 - 21:00",
                    location="B座 302大数据创新实验室",
                    organizer="学术发展协会",
                    category="工作坊",
                    status="open",
                    spots_left=3,
                    total_spots=40,
                    image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
                    description="从零开始介绍 Pandas、NumPy 以及 Matplotlib。通过实际的企业销售数据集，带你一步步构建数据清洗、分析建模与可视化展示图表。请自带笔记本电脑，提前配置好 Jupyter Notebook。",
                ),
                Event(
                    title="智心杯「秋季校园马拉松」10km热身跑",
                    date=today + timedelta(days=7),
                    time="07:00 - 09:30",
                    location="东区 田径体育场",
                    organizer="校区田径大队",
                    category="体育",
                    status="open",
                    spots_left=50,
                    total_spots=200,
                    image_url="https://images.unsplash.com/photo-1552674605-15c2145b2075?q=80&w=2071&auto=format&fit=crop",
                    description="生命在于运动！不论你是长跑达人还是跑步萌新，都欢迎来参与这场盛大的秋季晨跑活动。跑道沿途设有补水站和专业医疗团队，完赛即可获得纪念奖牌与定制体恤！",
                ),
                Event(
                    title="校园十佳歌手「音乐之夜」半决赛",
                    date=today + timedelta(days=10),
                    time="18:30 - 22:30",
                    location="南区 艺术表演大礼堂",
                    organizer="校大学生艺术团",
                    category="文艺",
                    status="open",
                    spots_left=0,  # Simulate closed
                    total_spots=350,
                    image_url="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2070&auto=format&fit=crop",
                    description="从海选中脱颖而出的20位顶尖校园好声音将在这里进行残酷的对决。灯光、舞台、乐队已全部就位，一起来为你喜欢的选手呐喊助威吧！全程在内网直播。",
                ),
                Event(
                    title="敬老院爱心周末探访活动",
                    date=today + timedelta(days=3),
                    time="08:00 - 12:00",
                    location="西门 喷泉广场集合大巴出发",
                    organizer="青年志愿者协会",
                    category="志愿服务",
                    status="open",
                    spots_left=12,
                    total_spots=30,
                    image_url="https://images.unsplash.com/photo-1593113565694-c6f87e675622?q=80&w=2070&auto=format&fit=crop",
                    description="与协会成员一同乘车前往市中心敬老院，陪伴孤寡老人聊天、下棋，协助打扫卫生。本次活动计入满 4 小时的志愿服务时长认证，请穿着协会统一服装并在指定地点集合。",
                )
            ]

            # Add recurring grouped events to simulate sequence
            recurring_events = [
                Event(
                    title="职场面对面模拟面试培训 (第1期)",
                    date=today + timedelta(days=1),
                    time="14:00 - 16:00",
                    location="职业发展中心 洽谈室",
                    organizer="求职互助组",
                    category="工作坊",
                    status="open",
                    spots_left=8,
                    total_spots=15,
                    image_url="https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=2070&auto=format&fit=crop",
                    description="系列活动：全方位打磨你的群面(无领导小组讨论)技巧。每周一场实战模拟并提供针对性复盘。只需报名一次即可获取整个系列课程的参与资格。",
                    group_id=recurring_group_id
                ),
                Event(
                    title="职场面对面模拟面试培训 (第2期)",
                    date=today + timedelta(days=8),
                    time="14:00 - 16:00",
                    location="职业发展中心 洽谈室",
                    organizer="求职互助组",
                    category="工作坊",
                    status="open",
                    spots_left=8,
                    total_spots=15,
                    description="系列活动：全方位打磨你的群面(无领导小组讨论)技巧。每周一场实战模拟并提供针对性复盘。只需报名一次即可获取整个系列课程的参与资格。",
                    group_id=recurring_group_id
                ),
                Event(
                    title="职场面对面模拟面试培训 (第3期)",
                    date=today + timedelta(days=15),
                    time="14:00 - 16:00",
                    location="职业发展中心 洽谈室",
                    organizer="求职互助组",
                    category="工作坊",
                    status="open",
                    spots_left=8,
                    total_spots=15,
                    description="系列活动：全方位打磨你的群面(无领导小组讨论)技巧。每周一场实战模拟并提供针对性复盘。只需报名一次即可获取整个系列课程的参与资格。",
                    group_id=recurring_group_id
                )
            ]
            
            db.add_all(events + recurring_events)

        if db.query(Room).count() == 0:
            db.add_all(
                [
                    Room(name="创新研讨室 101", capacity=6, equipment=["触控白板", "超清投影仪", "视频会议终端"]),
                    Room(name="创新研讨室 102", capacity=8, equipment=["磁性黑板", "智能电视", "独立茶水间"]),
                    Room(name="沙龙路演厅 A", capacity=30, equipment=["专业音响", "舞台灯光", "立式麦克风", "多屏联动显示"]),
                    Room(name="学术会议室 B", capacity=15, equipment=["环形会议桌", "激光笔", "投影仪"]),
                ]
            )

        if db.query(Announcement).count() == 0:
            db.add_all(
                [
                    Announcement(
                        title="关于防范近期高发兼职诈骗的紧急警告",
                        category="重要通知",
                        author="校园安全保卫处",
                        date=date(2025, 10, 15),
                        content="近期校园内外频发“刷单返利”、“代办高额信用卡”等兼职诈骗案件，多名学生蒙受巨大财产损失。请各位同学务必提高警惕，不轻信网络上任何轻松赚取高薪的广告，切勿透露个人银行卡密码验证码。如遇可疑人员或平台，第一时间上报辅导员并拨打校卫队电话 8888-0000 寻求帮助。",
                    ),
                    Announcement(
                        title="下学年全校跨专业选修课抢课指南",
                        category="教务信息",
                        author="学校教务处",
                        date=date(2025, 10, 12),
                        content="2025-2026学年春季学期全校公选课选课工作将于本周五下午 14:00 正式开启。由于本期新增了《当代硬笔书法解析》、《AI生成大模型入门实战》等热门课程，预计系统承压较大。请各位同学提前配置好网络环境，登录教务系统查看培养方案，做好课程时间规划。逾期未选或冲突选课后果自负。",
                    ),
                    Announcement(
                        title="深秋「宿舍文化节」卫生清理与优秀寝室评比大赛",
                        category="活动快讯",
                        author="学生工作处",
                        date=date(2025, 10, 11),
                        content="一年一度的宿舍文化节正式拉开帷幕！为了营造整洁、温馨、和谐的住宿环境，本周起将开展密集式卫生打扫运动。请大家互帮互助、断舍离。下周将会由宿管阿姨与学工老师组成评选委员会随机走访打分。优胜寝室每人将获得定制抱枕和电费补贴大礼包！",
                    ),
                    Announcement(
                        title="丢失一串附带『柴犬挂坠』的寝室钥匙",
                        category="失物招领",
                        author="热心学生 张三",
                        date=date(2025, 10, 10),
                        content="昨日晚上约8点在此前前往南区第一食堂就餐时，不慎将寝室钥匙遗失。钥匙环上栓有一只非常可爱的黄色柴犬玩偶挂件，对我意义重大！如果哪位好心同学捡到了，麻烦联系微信号: lostdog_2025。必买奶茶重谢！",
                    ),
                    Announcement(
                        title="图书馆三楼西北角自习室短暂断电检修的说明",
                        category="重要通知",
                        author="后勤管理集团",
                        date=date(2025, 9, 28),
                        content="接市电网通知，为排查主变压器线路隐患，本周日（10月20日）晚上 22:00 - 24:00 将对图书馆总控室进行拉闸检修。届时三楼西北角的插座和部分照明将中断，请正在馆内自习的同学提前保存电脑资料，以免断电造成数据丢失！",
                    ),
                ]
            )

        # Generate some QA interactions
        if db.query(QaQuestion).count() == 0:
            question1 = QaQuestion(
                title="大二软件工程专业，想走后端开发方向，现在是学Java还是Go更好？",
                content="我目前的课程学了C++和一点基础的Python，但是看到今年秋招好像Java非常卷，很多人推荐学Go语言。想听听各位学长学姐在目前互联网寒冬下的真实看法，以及需要准备哪些核心项目经验才能拿到大厂面霸？",
                tags=["求职", "开发", "技术讨论"],
                asker_id=admin.id,
                is_anonymous=False,
            )
            question2 = QaQuestion(
                title="如何有效克服强烈的上台演讲焦虑症？",
                content="每次轮到核心公共课的 PPT pre 环节我都会非常紧张，声音发抖甚至忘词。大家都是怎么锻炼心态克服这种登台演讲焦虑的？是否需要加入演讲与口才协会进行突击训练？",
                tags=["心理", "校园生活", "经验分享"],
                asker_id=admin.id,
                is_anonymous=True,
            )
            db.add_all([question1, question2])
            db.commit()
            db.refresh(question1)
            db.refresh(question2)

            if len(mentor_users) >= 2:
                # Assign mentors
                db.add(QaQuestionMentor(question_id=question1.id, mentor_id=mentor_users[0].id))
                db.add(QaQuestionMentor(question_id=question1.id, mentor_id=mentor_users[2].id))
                db.add(QaQuestionMentor(question_id=question2.id, mentor_id=mentor_users[1].id))
                db.commit()

                # Add answers
                db.add_all([
                    QaAnswer(
                        question_id=question1.id,
                        author_id=mentor_users[0].id,
                        content="从我的竞赛积累和目前各厂HC岗位来看：Java 生态体系依然是最坚不可摧的，大厂的核心中台（特别是金融、阿里系电商）绝不会轻易重构丢掉Java。但是如果你想走云原生、K8s甚至字节这种微服务极度盛行的土壤，Go的收益非常高。我建议你先把Java基础（并发、JVM调优、Spring全家桶）啃透作为吃饱饭的饭碗，然后把Go当作你的增量武器，简历上体现你深入理解了两种语言在应对高并发时的底层逻辑差异。",
                        is_best=True,
                        votes=15,
                    ),
                    QaAnswer(
                        question_id=question2.id,
                        author_id=mentor_users[1].id,
                        content="非常理解你的感受，这也是大部分同学会面临的门槛。产品岗经常需要跨部门汇报，我总结的三个实操经验：\n1. 极度熟练：将PPT逐字稿背诵并在镜子前讲30遍，肌肉记忆会带你扛过大脑的空白期。\n2. 脱敏训练：不要一开始就挑战大型演讲，先在2-3个好朋友面前模拟，慢慢扩大观众圈。\n3. 深呼吸+慢语速：上台前长舒一口气，故意把语速放慢一倍，这不仅让你显得胸有成竹，还能给大脑缓冲回忆的时间！加油！",
                        is_best=False,
                        votes=8,
                    )
                ])

        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed()

