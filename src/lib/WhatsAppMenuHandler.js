/**
 * Logic to handle WhatsApp Menu interactions
 * This would typically run in a serverless function (Supabase Edge Function)
 * or inside the n8n logic node.
 */

export const WhatsAppMenuHandler = {
    
    getMainMenu() {
        return {
            type: "list",
            header: "Fabric Store Menu",
            body: "Welcome! How can we help you today?",
            footer: "Select an option",
            action: {
                button: "Menu",
                sections: [
                    {
                        title: "Browse Collection",
                        rows: [
                            { id: "cat_rayon", title: "Rayon Designs" },
                            { id: "cat_cotton", title: "Cotton Designs" },
                            { id: "cat_silk", title: "Silk/Fancy" }
                        ]
                    },
                    {
                        title: "My Account",
                        rows: [
                            { id: "check_status", title: "Check Order Status" },
                            { id: "contact_support", title: "Contact Support" }
                        ]
                    }
                ]
            }
        };
    },

    handleSelection(selectionId) {
        switch(selectionId) {
            case 'cat_rayon':
                return { type: 'text', text: 'Fetching latest Rayon designs for you...' };
            case 'check_status':
                return { type: 'text', text: 'Please enter your Order ID (e.g. ORD-123)' };
            default:
                return { type: 'text', text: 'Option not recognized.' };
        }
    }
};