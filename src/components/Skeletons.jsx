import React from 'react'

export const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
        </div>
    </div>
)

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
            <thead className="bg-gray-50">
                <tr>
                    {Array.from({ length: cols }).map((_, i) => (
                        <th key={i} className="px-6 py-3">
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                        {Array.from({ length: cols }).map((_, colIndex) => (
                            <td key={colIndex} className="px-6 py-4">
                                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

export const SkeletonList = ({ items = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        ))}
    </div>
)

export const SkeletonGrid = ({ items = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        ))}
    </div>
)
