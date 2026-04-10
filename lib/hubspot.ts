import { HUBSPOT_API_KEY } from "./instantly";

// HubSpot CRM API helper methods
export async function syncContactToHubspot(contact: any) {
    const payload = {
        properties: {
            email: contact.email,
            firstname: contact.firstName,
            company: contact.companyName,
            instantly_status: contact.status,
            instantly_campaign: contact.campaign_name,
            lifecyclestage: mapStatusToLifecycleStage(contact.status),
        }
    };

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (response.status === 409) {
        // Conflict: Contact already exists. Update it instead (or use batch upsert endpoint natively)
        const data = await response.json();
        const existingId = data.message.split(" ")[data.message.split(" ").length - 1]; // "Contact already exists. Existing ID: 1234"

        const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        return updateResponse.json();
    }

    if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.statusText}`);
    }

    return response.json();
}

function mapStatusToLifecycleStage(status: string) {
    const lowercaseStatus = status?.toLowerCase() || '';
    if (lowercaseStatus.includes("replied")) return "lead";
    if (lowercaseStatus.includes("opened") || lowercaseStatus.includes("clicked")) return "subscriber";
    return ""; // default HubSpot will handle if passed empty or leave alone
}
