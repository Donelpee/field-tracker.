export const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FieldTrackerApp/1.0'
                }
            }
        )
        const data = await response.json()

        const addressParts = []
        if (data.address.road) addressParts.push(data.address.road)
        if (data.address.suburb) addressParts.push(data.address.suburb)
        if (data.address.city) addressParts.push(data.address.city)

        const shortAddress = addressParts.slice(0, 2).join(', ')
        const building = data.address.building || data.address.house_number || null

        return {
            full: data.display_name,
            short: shortAddress || data.display_name.split(',').slice(0, 2).join(','),
            building: building
        }
    } catch (error) {
        console.error('Error getting address:', error)
        return {
            full: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            short: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            building: null
        }
    }
}

export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'))
            return
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                })
            },
            (error) => {
                reject(error)
            },
            options
        )
    })
}
