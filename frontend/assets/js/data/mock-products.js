export const products = [
    {
        id: 1,
        name: "Elegant Gift Box",
        category: "Gift Boxes",
        description:
            "A beautiful gift box made to turn ordinary moments into unforgettable memories. Perfect for birthdays, celebrations and special occasions.",
        price: 25,
        stock_quantity: 12,
        product_type: "normal",
        is_active: true,
        customization_fee: 5,
        images: [
            {
                image_url: "https://placehold.co/800x800/E6E0F0/6F4E37?text=Elegant+Gift+Box",
                is_primary: true
            },
            {
                image_url: "https://placehold.co/800x800/E5E4E2/6F4E37?text=Gift+Box+Detail",
                is_primary: false
            },
            {
                image_url: "https://placehold.co/800x800/F4EAF1/6F4E37?text=Gift+Packaging",
                is_primary: false
            }
        ],
        wrapping_options: [
            {
                name: "Basic Wrapping",
                price: 0
            },
            {
                name: "Premium Wrapping",
                price: 3
            }
        ]
    },
    {
        id: 2,
        name: "Classic Birthday Package",
        category: "Packages",
        description:
            "A cheerful birthday package with carefully selected items to make someone's day extra special.",
        price: 35,
        stock_quantity: 8,
        product_type: "package",
        is_active: true,
        customization_fee: 7,
        images: [
            {
                image_url: "https://placehold.co/800x800/E6E0F0/6F4E37?text=Birthday+Package",
                is_primary: true
            },
            {
                image_url: "https://placehold.co/800x800/E5E4E2/6F4E37?text=Birthday+Details",
                is_primary: false
            }
        ],
        wrapping_options: [
            {
                name: "Basic Wrapping",
                price: 0
            },
            {
                name: "Premium Wrapping",
                price: 4
            }
        ]
    }
];

export function getProductById(id) {
    return products.find(
        product =>
            String(product.id) === String(id) &&
            product.is_active === true
    ) ?? null;
}