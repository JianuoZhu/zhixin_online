export const mockRooms = [
    {
        id: 1,
        name: "讨论间 101",
        capacity: 6,
        equipment: ["白板", "投影仪"],
        bookings: [
            { day: "2025-10-14", start: 9, end: 11, user: "张三" },
            { day: "2025-10-14", start: 14, end: 16, user: "李四" },
        ],
    },
    {
        id: 2,
        name: "讨论间 102",
        capacity: 8,
        equipment: ["白板", "电视"],
        bookings: [
            { day: "2025-10-14", start: 10, end: 12, user: "王五" },
            { day: "2025-10-15", start: 15, end: 17, user: "赵六" },
        ],
    },
    {
        id: 3,
        name: "多功能活动室",
        capacity: 30,
        equipment: ["投影仪", "音响", "麦克风"],
        bookings: [
            { day: "2025-10-14", start: 18, end: 21, user: "学生会" },
        ],
    },
];