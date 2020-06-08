import * as ServiceList from '../src/serviceList'

type ServiceListKeys = keyof typeof ServiceList;
export type SharedFolder = typeof ServiceList[ServiceListKeys]

export type WebsocketOpt = {
    remixIdeUrl: string
}

export type FolderArgs = {
    path: string
}

export type KeyPairString = {
    [key: string]: string
}

export type ResolveDirectory = {
    [key: string]: {
        isDirectory: boolean
    }
}

export type TrackDownStreamUpdate = KeyPairString

export type SharedFolderArgs = FolderArgs & KeyPairString